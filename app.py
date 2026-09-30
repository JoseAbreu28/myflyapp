from datetime import datetime, timezone
from io import BytesIO
import math
from pathlib import Path
import textwrap
import re
from urllib.parse import quote

from flask import Flask, Response, jsonify, render_template, request
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import requests

import config

app = Flask(__name__)
_cache = {}
_flyweather_cam_ts_cache = {"value": None, "timestamp": None}
_five_letter_codes_cache = {"value": None, "timestamp": None}
_CEILING_RE = re.compile(r"\b(BKN|OVC|VV)(\d{3})\b")
_FLYWEATHER_CAM_TS_RE = re.compile(r"cam31\.jpg\?t=(\d+)")
_FIVE_LETTER_CODE_RE = re.compile(
    r"\[\[null,\[(-?[0-9.]+),(-?[0-9.]+)\]\].*?\[\[\\?\"([A-Z0-9]{5})\\?\"\]\]",
    re.DOTALL,
)
FPLBRIEFING_PIB_URL = "https://fplbriefing.nav.pt/rest/api/create-narrow-route-pib"
FPLBRIEFING_ROUTE_URL = "https://fplbriefing.nav.pt/rest/api/rest/routes/route/{route_id}"
FIVE_LETTER_MAP_URL = "https://www.google.com/maps/d/u/0/viewer?mid=1oVtBoQ-PRBQTyPVgwQo6yRjzazh0qGke&ll=40.46680875293716%2C-8.208544801568893&z=8"
FLIGHTLOG_TEMPLATE_PATH = Path(__file__).resolve().parent / "static" / "pdf" / "flightlogAcporto-template.pdf"


def _pdf_text(value):
    text = str(value or "")
    return (
        text.encode("latin-1", "replace")
        .decode("latin-1")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _build_simple_pdf(title, sections):
    width, height = 595, 842
    margin_x = 48
    line_h = 14
    y_start = 792
    y_min = 52
    pages = []
    lines = []

    def push_line(text="", size=10):
        nonlocal lines
        wrapped = textwrap.wrap(str(text), width=94) or [""]
        for part in wrapped:
            lines.append((part, size))
            if len(lines) * line_h > (y_start - y_min):
                pages.append(lines)
                lines = []

    push_line(title, 16)
    push_line(f"Gerado em {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", 9)
    push_line("")
    for heading, rows in sections:
        push_line(heading, 13)
        for row in rows:
            push_line(row, 10)
        push_line("")
    if lines:
        pages.append(lines)

    objects = []

    def add_obj(data):
        objects.append(data)
        return len(objects)

    font_id = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids = []
    content_ids = []
    for page_lines in pages:
        y = y_start
        stream_parts = []
        for text, size in page_lines:
            stream_parts.append(f"BT /F1 {size} Tf {margin_x} {y} Td ({_pdf_text(text)}) Tj ET\n")
            y -= line_h
        stream = "".join(stream_parts).encode("latin-1", "replace")
        content_id = add_obj(
            b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream"
        )
        content_ids.append(content_id)
        page_ids.append(None)

    pages_id_placeholder = len(objects) + len(pages) + 1
    for idx, content_id in enumerate(content_ids):
        page_id = add_obj(
            f"<< /Type /Page /Parent {pages_id_placeholder} 0 R /MediaBox [0 0 {width} {height}] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode("ascii")
        )
        page_ids[idx] = page_id

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages_id = add_obj(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii"))
    catalog_id = add_obj(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("ascii"))

    out = BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj_id, data in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{obj_id} 0 obj\n".encode("ascii"))
        out.write(data)
        out.write(b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    out.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii")
    )
    return out.getvalue()


def _distance_nm(lat1, lon1, lat2, lon2):
    """Return an approximate great-circle distance in nautical miles."""
    lat1_rad = math.radians(float(lat1))
    lat2_rad = math.radians(float(lat2))
    delta_lat = lat2_rad - lat1_rad
    delta_lon = math.radians(float(lon2) - float(lon1))
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    return 3440.065 * 2 * math.asin(math.sqrt(max(0.0, min(1.0, haversine))))


def _load_five_letter_codes():
    cached_at = _five_letter_codes_cache.get("timestamp")
    cached_value = _five_letter_codes_cache.get("value")
    if cached_at and cached_value:
        age = (datetime.now(timezone.utc) - cached_at).total_seconds()
        if age <= 86400:
            return cached_value

    try:
        response = requests.get(
            FIVE_LETTER_MAP_URL,
            headers={"User-Agent": "MyFlyApp navigation planner"},
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException:
        return []

    points = []
    seen = set()
    for match in _FIVE_LETTER_CODE_RE.finditer(response.text):
        code = match.group(3)
        if code in seen:
            continue
        seen.add(code)
        points.append({"code": code, "lat": float(match.group(1)), "lng": float(match.group(2))})

    if points:
        _five_letter_codes_cache["value"] = points
        _five_letter_codes_cache["timestamp"] = datetime.now(timezone.utc)
    return points


def _nearest_five_letter_code(lat, lng):
    points = _load_five_letter_codes()
    if not points:
        return None
    nearest = min(points, key=lambda point: _distance_nm(lat, lng, point["lat"], point["lng"]))
    return {
        **nearest,
        "distance_nm": round(_distance_nm(lat, lng, nearest["lat"], nearest["lng"]), 2),
        "source_url": FIVE_LETTER_MAP_URL,
    }


def _build_pdf_document(streams, width, height):
    objects = []

    def add_obj(data):
        objects.append(data)
        return len(objects)

    regular_font_id = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    bold_font_id = add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    content_ids = []
    for stream in streams:
        raw_stream = stream.encode("latin-1", "replace")
        content_ids.append(
            add_obj(
                b"<< /Length "
                + str(len(raw_stream)).encode("ascii")
                + b" >>\nstream\n"
                + raw_stream
                + b"endstream"
            )
        )

    pages_id_placeholder = len(objects) + len(streams) + 1
    page_ids = []
    for content_id in content_ids:
        page_ids.append(
            add_obj(
                f"<< /Type /Page /Parent {pages_id_placeholder} 0 R /MediaBox [0 0 {width} {height}] "
                f"/Resources << /Font << /F1 {regular_font_id} 0 R /F2 {bold_font_id} 0 R >> >> "
                f"/Contents {content_id} 0 R >>".encode("ascii")
            )
        )

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages_id = add_obj(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii"))
    catalog_id = add_obj(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("ascii"))

    output = BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj_id, data in enumerate(objects, start=1):
        offsets.append(output.tell())
        output.write(f"{obj_id} 0 obj\n".encode("ascii"))
        output.write(data)
        output.write(b"\nendobj\n")
    xref = output.tell()
    output.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref}\n%%EOF\n".encode("ascii")
    )
    return output.getvalue()


def _build_navigation_log_pdf_legacy(body):
    """Deprecated generic report kept only as a historical fallback reference."""
    width, height = 841.89, 595.28
    page_stream = []

    def command(value):
        page_stream.append(value)

    def color(rgb, stroke=False):
        suffix = "RG" if stroke else "rg"
        command(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} {suffix}")

    def rect(x, y, w, h, fill=None, stroke=(0.16, 0.19, 0.24), line=0.7):
        if fill is not None:
            color(fill)
        color(stroke, stroke=True)
        command(f"{line:.2f} w {x:.1f} {y:.1f} {w:.1f} {h:.1f} re")
        command("B" if fill is not None else "S")

    def line(x1, y1, x2, y2, stroke=(0.16, 0.19, 0.24), line_width=0.7):
        color(stroke, stroke=True)
        command(f"{line_width:.2f} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")

    def text(value, x, y, size=8.5, bold=False, fill=(0.08, 0.10, 0.14)):
        color(fill)
        font = "F2" if bold else "F1"
        command(f"BT /{font} {size:.1f} Tf {x:.1f} {y:.1f} Td ({_pdf_text(value)}) Tj ET")

    def wrapped(value, x, y, max_width, size=7.5, bold=False, line_height=None, max_lines=None, fill=(0.08, 0.10, 0.14)):
        if line_height is None:
            line_height = size + 2
        chars = max(1, int(max_width / max(size * 0.5, 1)))
        parts = textwrap.wrap(str(value or "-"), width=chars) or [""]
        if max_lines is not None:
            parts = parts[:max_lines]
        for index, part in enumerate(parts):
            text(part, x, y - index * line_height, size=size, bold=bold, fill=fill)
        return len(parts)

    def value(value, fallback="-"):
        if value is None or str(value).strip() == "":
            return fallback
        return str(value)

    metadata = body.get("metadata") or {}
    legs = body.get("legs") or []
    phases = body.get("phases") or {}
    e6b = body.get("e6b") or {}
    alternate = body.get("alternate") or {}
    references = body.get("references") or []
    document_label = value(body.get("document_label") or metadata.get("document_label"), "NAVEGAÇÃO")
    suppress_fuel = bool(body.get("suppress_fuel"))

    margin = 28
    navy = (0.07, 0.12, 0.20)
    light = (0.94, 0.96, 0.98)
    muted = (0.35, 0.40, 0.47)
    rect(margin, height - 52, width - 2 * margin, 28, fill=navy, stroke=navy, line=0.8)
    text(f"FLIGHT LOG - {document_label}", margin + 10, height - 42, size=14, bold=True, fill=(1, 1, 1))
    text("MYFLYAPP - NAVEGAÇÃO", width - margin - 155, height - 40, size=8, bold=True, fill=(0.82, 0.88, 0.96))

    meta_y = height - 72
    meta_values = [
        ("Aircraft / Ident", value(metadata.get("aircraft_ident")), margin, 175),
        ("Pilot", value(metadata.get("pilot")), margin + 185, 215),
        ("Date", value(metadata.get("date")), margin + 410, 120),
        ("Variation", "1° W", margin + 540, 90),
    ]
    for label, item, x, field_width in meta_values:
        rect(x, meta_y - 12, field_width, 20, fill=(1, 1, 1))
        text(f"{label}: {item}", x + 6, meta_y - 4, size=7.4)

    left_x, left_w = margin, 548
    right_x, right_w = 594, width - margin - 594
    table_top = height - 107
    header_h = 38
    columns = [
        ("Checkpoints / Fixes", 119),
        ("AID / Freq", 55),
        ("Altitude / FL", 58),
        ("MAG TRACK", 65),
        ("Wind kt", 45),
        ("MAG HEAD", 60),
        ("Dist", 45),
        ("GS", 45),
        ("Time", 56),
    ]
    rect(left_x, table_top - header_h, left_w, header_h, fill=light)
    current_x = left_x
    for label, column_w in columns:
        line(current_x, table_top, current_x, table_top - header_h)
        wrapped(label, current_x + 4, table_top - 12, column_w - 8, size=7, bold=True, line_height=8, max_lines=3)
        current_x += column_w
    line(left_x + left_w, table_top, left_x + left_w, table_top - header_h)
    line(left_x, table_top, left_x + left_w, table_top)
    line(left_x, table_top - header_h, left_x + left_w, table_top - header_h)

    row_h = 23
    max_rows = 15
    shown_legs = legs[:max_rows]
    if len(legs) > max_rows:
        shown_legs = shown_legs[:-1] + [{"label": "...", "note": "Mais pernas no relatório digital"}]
    for row_index in range(max_rows):
        row_top = table_top - header_h - row_index * row_h
        row_bottom = row_top - row_h
        rect(left_x, row_bottom, left_w, row_h, fill=(1, 1, 1) if row_index % 2 == 0 else (0.97, 0.98, 0.99))
        current_x = left_x
        leg = shown_legs[row_index] if row_index < len(shown_legs) else {}
        row_values = [
            value(leg.get("label")),
            value(leg.get("aid_freq")),
            value(leg.get("altitude")),
            value(leg.get("mag_track")),
            value(leg.get("wind_speed")),
            value(leg.get("mag_head")),
            value(leg.get("nm")),
            value(leg.get("gs")),
            value(leg.get("time")),
        ]
        for (_, column_w), cell_value in zip(columns, row_values):
            line(current_x, row_top, current_x, row_bottom)
            wrapped(cell_value, current_x + 4, row_top - 14, column_w - 8, size=7.2, max_lines=2)
            current_x += column_w
        line(left_x + left_w, row_top, left_x + left_w, row_bottom)
        line(left_x, row_bottom, left_x + left_w, row_bottom)
    table_bottom = table_top - header_h - max_rows * row_h

    def info_box(title, top, rows, box_height):
        rect(right_x, top - box_height, right_w, box_height, fill=(1, 1, 1))
        text(title, right_x + 7, top - 14, size=9, bold=True, fill=navy)
        line(right_x, top - 22, right_x + right_w, top - 22, stroke=navy, line_width=1.1)
        cursor = top - 36
        for label, item in rows:
            text(label, right_x + 7, cursor, size=7.1, bold=True, fill=muted)
            wrapped(item, right_x + 70, cursor, right_w - 78, size=7.4, max_lines=2)
            cursor -= 20

    info_box(
        "TOC / TOD",
        table_top,
        [
            ("TOC", f"{value(phases.get('toc_nm'))} from {value(phases.get('toc_reference'), 'DEP')}"),
            ("Start", value(phases.get('toc_start_altitude_ft'))),
            ("Climb", f"{value(phases.get('toc_climb_speed_kt'))} · {value(phases.get('toc_climb_rate_fpm'))} · {value(phases.get('toc_climb_time'))}"),
            ("Cruise", value(phases.get('cruise_altitude_ft'))),
            ("Dest", value(phases.get('destination_altitude_ft'))),
            ("TOD", f"{value(phases.get('tod_before_dest_nm'))} before DEST"),
            ("Descent", value(phases.get('descent_altitude_ft'))),
            ("Formula", "TOD = delta altitude (000 ft) x 3 + 2"),
        ],
        194,
    )
    info_box(
        "E6B / FUEL",
        table_top - 204,
        [
            ("Route", value(e6b.get("nm"))),
            ("Time", value(e6b.get("time"))),
            ("GS", value(e6b.get("speed"))),
            ("Fuel", "-" if suppress_fuel else value(e6b.get("fuel"))),
            ("Reserve", "-" if suppress_fuel else value(e6b.get("final_reserve"))),
            ("Alt.", value(e6b.get("alternate_nm"))),
        ],
        150,
    )
    alternate_label = value(alternate.get("title"), "Sem alternante") if alternate else "Sem alternante"
    info_box(
        "ALTERNATE / NOTES",
        table_top - 345,
        [
            ("Alternate", alternate_label),
            ("Points", f"{len(legs) + 1 if legs else 0} route points"),
            ("Refs", f"{len(references)} reference(s)"),
        ],
        82,
    )

    if not legs:
        text("Sem pernas de rota definidas.", left_x + 8, table_bottom - 14, size=8, fill=muted)
    disclaimer = (
        "Apoio ao planeamento: confirme carta oficial, AIP/eAIP, NOTAM, altitudes, vento, obstáculos e briefing. "
        "MAG TRACK = track verdadeiro + 1° para variação 1° W. O vento é reportado no formato indicado, sem fabricar correção de vento."
    )
    wrapped(disclaimer, margin, 38, width - 2 * margin, size=7.1, fill=muted, max_lines=2)
    text(
        f"Gerado em {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · MyFlyApp",
        width - margin - 220,
        23,
        size=6.8,
        fill=muted,
    )
    return _build_pdf_document(["\n".join(page_stream)], width, height)


def _build_navigation_log_template_pdf(body):
    """Fill the supplied Aero Club do Porto flight-log form without changing its layout."""
    if not FLIGHTLOG_TEMPLATE_PATH.is_file():
        raise FileNotFoundError(f"Flight-log template not found: {FLIGHTLOG_TEMPLATE_PATH}")

    page_width, page_height = 841.92, 595.32
    metadata = body.get("metadata") or {}
    legs = body.get("legs") or []
    phases = body.get("phases") or {}
    e6b = body.get("e6b") or {}
    suppress_fuel = bool(body.get("suppress_fuel"))

    def clean(value):
        if value is None:
            return ""
        text = str(value).strip()
        return "" if text in {"-", "--", "None", "null"} else text

    def without_suffix(value, suffix):
        text = clean(value)
        if text.lower().endswith(suffix.lower()):
            return text[: -len(suffix)].strip()
        return text

    def wind_value(leg):
        direction = clean(leg.get("wind_direction"))
        speed = clean(leg.get("wind_speed_kt"))
        if direction and speed:
            try:
                return f"{int(round(float(direction))) % 360:03d}/{int(round(float(speed))):02d}"
            except (TypeError, ValueError):
                pass
        return clean(leg.get("wind_speed")).replace("kts", "").strip()

    def truncate(text, max_chars):
        text = clean(text)
        return text if len(text) <= max_chars else f"{text[: max_chars - 1]}…"

    def draw_text(pdf, x, y, value, size=7.0, bold=False, max_chars=None):
        text = clean(value)
        if max_chars:
            text = truncate(text, max_chars)
        if not text:
            return
        pdf.setFillColor(HexColor("#003b5c"))
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(x, y, text)

    def numeric_nm(value):
        try:
            return float(str(value).replace(",", ".").split()[0])
        except (TypeError, ValueError, IndexError):
            return 0.0

    def route_cell_values(leg):
        return [
            truncate(leg.get("checkpoint") or leg.get("label"), 18),
            clean(leg.get("aid_freq")),
            without_suffix(leg.get("altitude"), "ft"),
            without_suffix(leg.get("mag_track"), "deg"),
            wind_value(leg),
            without_suffix(leg.get("mag_head"), "deg"),
            "" if suppress_fuel else clean(leg.get("fuel_remaining")),
            without_suffix(leg.get("nm"), "nm"),
            without_suffix(leg.get("gs"), "kt"),
            clean(leg.get("time")),
            clean(leg.get("eta")),
        ]

    overlay_stream = BytesIO()
    pdf = canvas.Canvas(overlay_stream, pagesize=(page_width, page_height))
    pdf.setTitle("flightlogAcporto")

    # Header fields of the primary (left) sheet.
    draw_text(pdf, 94, 552, metadata.get("aircraft_ident"), size=7.5, max_chars=24)
    draw_text(pdf, 184, 552, metadata.get("pilot"), size=7.5, max_chars=24)
    draw_text(pdf, 337, 552, metadata.get("date"), size=7.5, max_chars=16)

    points = body.get("points") or []
    initial_point = points[0].get("code") if points else ""
    draw_text(pdf, 322, 437, initial_point, size=7.0, max_chars=22)
    alternate = body.get("alternate") or {}
    alternate_points = alternate.get("route_points") or []
    alternate_initial_point = (alternate_points[0].get("code") if alternate_points else "") or initial_point
    draw_text(pdf, 737, 437, alternate_initial_point, size=7.0, max_chars=22)

    # The left table is the mandatory primary flight-log sheet. These coordinates
    # match the printed form's fixed cells; the background PDF remains untouched.
    left_x = [36, 90, 112, 154, 186, 210, 247, 273, 302, 334, 377]
    row_y = [363, 326, 290, 253, 217, 180, 144, 107, 71]
    phase_values = (
        phases.get("toc_nm"),
        phases.get("tod_before_dest_nm"),
        phases.get("toc_start_altitude_ft"),
        phases.get("cruise_altitude_ft"),
    )
    phase_rows = any(clean(value) for value in phase_values)
    route_rows = list(legs)
    route_labels = {clean(row.get("checkpoint") or row.get("label")).upper() for row in route_rows}
    if phase_rows and legs and "TOC" not in route_labels:
        route_rows.insert(1, {"checkpoint": "TOC"})
    if phase_rows and legs and "TOD" not in route_labels:
        route_rows.append({"checkpoint": "TOD"})

    for row_y_value, leg in zip(row_y, route_rows[: len(row_y)]):
        for column_x, cell in zip(left_x, route_cell_values(leg)):
            draw_text(pdf, column_x, row_y_value, cell, size=6.7, max_chars=15)

    # The right half of the same printed sheet is reserved for the alternate
    # route. Fill it from the alternate's own phase-aware legs when supplied,
    # including its independent track, wind, heading, GS and time values.
    alternate_rows = alternate.get("legs") or []
    if not alternate_rows and alternate_points:
        alternate_rows = [{"checkpoint": point.get("code") or point.get("title") or ""} for point in alternate_points]
    alternate_row_y = [372, 336, 300, 264]
    alternate_left_x = [435 + (value - 36) for value in left_x]
    for row_y_value, leg in zip(alternate_row_y, alternate_rows[: len(alternate_row_y)]):
        for column_x, cell in zip(alternate_left_x, route_cell_values(leg)):
            draw_text(pdf, column_x, row_y_value, cell, size=6.4, max_chars=15)

    total_nm = sum(numeric_nm(leg.get("nm")) for leg in legs)
    if total_nm:
        # Printed TOTAL cell below the primary table.
        draw_text(pdf, 272, 37, f"{total_nm:.1f} NM", size=7.0, max_chars=12)

    # Keep fuel unfilled when the caller marks the report as provisional. The
    # generated phase data is written into the printed Notes area so it remains
    # available without disturbing the form's ATIS, landing or fuel blocks.
    if not suppress_fuel:
        fuel_value = clean(e6b.get("fuel"))
        if fuel_value:
            draw_text(pdf, 740, 213, fuel_value, size=7.0, max_chars=14)

    phase_lines = []
    if phases:
        toc_nm = clean(phases.get("toc_nm"))
        toc_reference = clean(phases.get("toc_reference")) or "DEP"
        toc_route_nm = clean(phases.get("toc_from_departure_nm"))
        toc_value = toc_nm or "unavailable"
        toc_position = f" ({toc_route_nm} from DEP)" if toc_route_nm else ""
        phase_lines.append(f"TOC: {toc_value} from {toc_reference}{toc_position}")
        start_altitude = clean(phases.get("toc_start_altitude_ft"))
        toc_altitude = clean(phases.get("cruise_altitude_ft"))
        climb_rate = clean(phases.get("toc_climb_rate_fpm"))
        climb_speed = clean(phases.get("toc_climb_speed_kt"))
        climb_time = clean(phases.get("toc_climb_time"))
        if any((start_altitude, toc_altitude, climb_rate, climb_speed, climb_time)):
            phase_lines.append(
                f"Climb: {start_altitude}->{toc_altitude} / {climb_rate} / {climb_speed} / {climb_time}"
            )
        tod_nm = clean(phases.get("tod_before_dest_nm")) or "unavailable"
        phase_lines.append(f"TOD: {tod_nm} before DEST")
    else:
        phase_lines.extend(["TOC: unavailable", "TOD: unavailable"])

    alternate_points = alternate.get("route_points") or []
    alternate_codes = [clean(point.get("code")) for point in alternate_points if clean(point.get("code"))]
    if alternate:
        alternate_label = clean(alternate.get("title")) or "unavailable"
        alternate_route = " -> ".join(alternate_codes) if alternate_codes else "unavailable"
        phase_lines.append(f"Alternate: {alternate_label} / {alternate_route}")
        alternate_phases = alternate.get("phases") or {}
        alternate_toc = clean(alternate_phases.get("toc_nm")) or "unavailable"
        alternate_tod = clean(alternate_phases.get("tod_before_dest_nm")) or "unavailable"
        phase_lines.append(f"Alt TOC: {alternate_toc} / TOD: {alternate_tod}")

    notes_x = 610
    notes_y = 186
    if phase_lines:
        for index, line in enumerate(phase_lines[:5], start=1):
            draw_text(pdf, notes_x, notes_y - ((index - 1) * 11), line, size=6.2, max_chars=60)
    pdf.save()
    overlay_stream.seek(0)

    base_reader = PdfReader(str(FLIGHTLOG_TEMPLATE_PATH))
    overlay_reader = PdfReader(overlay_stream)
    base_page = base_reader.pages[0]
    base_page.merge_page(overlay_reader.pages[0])
    writer = PdfWriter()
    writer.add_page(base_page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()

AERODROMES = [
    {"icao": "LPPT", "name": "Lisboa Humberto Delgado", "lat": 38.7742, "lon": -9.1342, "atis": "124.155", "main_freq": "118.105"},
    {"icao": "LPPR", "name": "Porto Francisco Sa Carneiro", "lat": 41.2481, "lon": -8.6814, "atis": "124.305", "main_freq": "120.910"},
    {"icao": "LPFR", "name": "Faro", "lat": 37.0144, "lon": -7.9659, "atis": "124.205", "main_freq": "120.755"},
    {"icao": "LPMA", "name": "Madeira Cristiano Ronaldo", "lat": 32.6979, "lon": -16.7745, "atis": "130.355", "main_freq": "124.660"},
    {"icao": "LPPS", "name": "Porto Santo", "lat": 33.0734, "lon": -16.3495, "atis": "N/A", "main_freq": "120.055"},
    {"icao": "LPAZ", "name": "Santa Maria", "lat": 36.9714, "lon": -25.1706, "atis": "N/A", "main_freq": "118.100"},
    {"icao": "LPPD", "name": "Ponta Delgada Joao Paulo II", "lat": 37.7412, "lon": -25.6979, "atis": "123.900", "main_freq": "118.300"},
    {"icao": "LPLA", "name": "Lajes", "lat": 38.7618, "lon": -27.0908, "atis": "120.300", "main_freq": "122.100"},
    {"icao": "LPHR", "name": "Horta", "lat": 38.5199, "lon": -28.7159, "atis": "121.100", "main_freq": "118.000"},
    {"icao": "LPPI", "name": "Pico", "lat": 38.5543, "lon": -28.4413, "atis": "N/A", "main_freq": "122.700"},
    {"icao": "LPSJ", "name": "Sao Jorge", "lat": 38.6655, "lon": -28.1758, "atis": "N/A", "main_freq": "119.800"},
    {"icao": "LPFL", "name": "Flores", "lat": 39.4553, "lon": -31.1314, "atis": "N/A", "main_freq": "118.800"},
    {"icao": "LPCR", "name": "Corvo", "lat": 39.6715, "lon": -31.1136, "atis": "N/A", "main_freq": "122.300"},
    {"icao": "LPGR", "name": "Graciosa", "lat": 39.0922, "lon": -28.0298, "atis": "N/A", "main_freq": "122.900"},
    {"icao": "LPEV", "name": "Evora", "lat": 38.5335, "lon": -7.8896, "atis": "N/A", "main_freq": "122.705"},
    {"icao": "LPCS", "name": "Cascais", "lat": 38.7250, "lon": -9.3552, "atis": "N/A", "main_freq": "120.305"},
    {"icao": "LPBJ", "name": "Beja", "lat": 38.0789, "lon": -7.9324, "atis": "N/A", "main_freq": "130.415"},
    {"icao": "LPMR", "name": "Monte Real", "lat": 39.8283, "lon": -8.8875, "atis": "N/A", "main_freq": "118.640"},
    {"icao": "LPVL", "name": "Vilar de Luz", "lat": 41.2792, "lon": -8.5172, "atis": "N/A", "main_freq": "122.405"},
    {"icao": "LPVZ", "name": "Viseu", "lat": 40.7255, "lon": -7.8889, "atis": "N/A", "main_freq": "122.710"},
    {"icao": "LPBR", "name": "Braga", "lat": 41.5871, "lon": -8.4451, "atis": "N/A", "main_freq": "122.005"},
    {"icao": "LPVR", "name": "Vila Real", "lat": 41.2743, "lon": -7.7205, "atis": "N/A", "main_freq": "124.905"},
    {"icao": "LPCH", "name": "Chaves", "lat": 41.7224, "lon": -7.4667, "atis": "N/A", "main_freq": "122.705"},
    # Coordenadas ARP e cartas: NAV Portugal eVFR/AIP; links PT mantêm a edição oficial publicada.
    {"icao": "LPCO", "name": "Coimbra", "lat": 40.156111, "lon": -8.469167, "atis": "N/A", "main_freq": "122.905", "aip_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.LPCO-pt-PT.html", "adc_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPCO-ADC_pt.pdf", "vac_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPCO-VAC_pt.pdf"},
    {"icao": "LPMU", "name": "Mogadouro", "lat": 41.394444, "lon": -6.684444, "atis": "N/A", "main_freq": "120.105", "aip_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.LPMU-pt-PT.html", "adc_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPMU-ADC_pt.pdf", "vac_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPMU-VAC_pt.pdf"},
    {"icao": "LPMI", "name": "Mirandela", "lat": 41.470278, "lon": -7.227778, "atis": "N/A", "main_freq": "122.205", "aip_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.LPMI-pt-PT.html", "adc_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPMI-ADC_pt.pdf", "vac_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPMI-VAC_pt.pdf"},
    {"icao": "LPBG", "name": "Bragança", "lat": 41.856667, "lon": -6.707500, "atis": "N/A", "main_freq": "122.305", "aip_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.LPBG-pt-PT.html", "adc_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPBG-ADC_pt.pdf", "vac_pdf_url": "https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_LPBG-VAC_pt.pdf"},
]


def _cache_get(key):
    entry = _cache.get(key)
    if not entry:
        return None
    age_seconds = (datetime.now(timezone.utc) - entry["timestamp"]).total_seconds()
    if age_seconds > config.CACHE_TTL_SECONDS:
        return None
    payload = dict(entry["payload"])
    payload["cached_at"] = entry["timestamp"].isoformat()
    return payload


def _cache_set(key, payload):
    _cache[key] = {
        "timestamp": datetime.now(timezone.utc),
        "payload": payload,
    }


def _get_flyweather_cam_timestamp():
    now = datetime.now(timezone.utc)
    cached_ts = _flyweather_cam_ts_cache.get("timestamp")
    if cached_ts is not None:
        age_seconds = (now - cached_ts).total_seconds()
        if age_seconds <= 600 and _flyweather_cam_ts_cache.get("value"):
            return _flyweather_cam_ts_cache["value"]

    value = str(int(now.timestamp()))
    try:
        response = requests.get(
            "https://www.flyweather.net/station.php?lang=en&station_id=31",
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        match = _FLYWEATHER_CAM_TS_RE.search(response.text)
        if match:
            value = match.group(1)
    except requests.RequestException:
        pass

    _flyweather_cam_ts_cache["value"] = value
    _flyweather_cam_ts_cache["timestamp"] = now
    return value


def _to_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_ceiling_ft(clouds):
    if not clouds:
        return None
    layers = []
    for layer in clouds:
        cover = (layer.get("cover") or "").upper()
        base = _to_float(layer.get("base"))
        if base is None:
            continue
        if cover in {"BKN", "OVC", "VV"}:
            layers.append(base)
    return min(layers) if layers else None


def _extract_from_raw_metar(raw):
    if not raw:
        return None, None

    visibility_sm = None
    ceiling_ft = None

    tokens = raw.split()
    for token in tokens:
        if token == "9999":
            visibility_sm = 6.2
            break
        if len(token) == 4 and token.isdigit():
            meters = _to_float(token)
            if meters is not None and meters <= 9999:
                visibility_sm = round(meters / 1609.34, 1)
                break

    ceiling_candidates = []
    for cover, height_hundreds in _CEILING_RE.findall(raw):
        if cover in {"BKN", "OVC", "VV"}:
            ceiling_candidates.append(int(height_hundreds) * 100)
    if ceiling_candidates:
        ceiling_ft = min(ceiling_candidates)

    return visibility_sm, ceiling_ft


def _normalize_obs_time(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    numeric = _to_float(value)
    if numeric and numeric > 1_000_000_000:
        return datetime.fromtimestamp(numeric, tz=timezone.utc).isoformat()
    return value


def _flight_category(ceiling_ft, visibility_sm):
    if ceiling_ft is None and visibility_sm is None:
        return "UNKNOWN"

    if (ceiling_ft is not None and ceiling_ft < 500) or (
        visibility_sm is not None and visibility_sm < 1
    ):
        return "LIFR"
    if (ceiling_ft is not None and ceiling_ft <= 1000) or (
        visibility_sm is not None and visibility_sm <= 3
    ):
        return "IFR"
    if (ceiling_ft is not None and ceiling_ft <= 3000) or (
        visibility_sm is not None and visibility_sm <= 5
    ):
        return "MVFR"
    return "VFR"


def _safe_metar_response():
    return {
        "error": "unavailable",
        "raw": None,
        "flight_category": "UNKNOWN",
        "station": config.HOME_AERODROME,
        "wind_dir": None,
        "wind_speed": None,
        "visibility": None,
        "ceiling": None,
        "temp": None,
        "dewpoint": None,
        "altimeter": None,
        "obs_time": None,
        "cached_at": None,
    }


def _safe_taf_response():
    return {
        "error": "unavailable",
        "raw": None,
        "station": config.HOME_AERODROME,
        "time": None,
        "forecast_periods": [],
        "cached_at": None,
    }


def _fetch_json(url, params):
    response = requests.get(url, params=params, timeout=config.REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.json()


def _build_metar_payload(icao):
    records = _fetch_json(
        config.AVWX_METAR_URL,
        {"ids": icao, "format": "json"},
    )
    if not records:
        return _safe_metar_response()

    metar = records[0]
    raw_metar = metar.get("rawOb") or metar.get("raw") or metar.get("observation")
    visibility_sm = _to_float(metar.get("visib"))
    clouds = metar.get("clouds") or []
    ceiling_ft = _extract_ceiling_ft(clouds)
    if visibility_sm is None or ceiling_ft is None:
        raw_visibility, raw_ceiling = _extract_from_raw_metar(raw_metar)
        if visibility_sm is None:
            visibility_sm = raw_visibility
        if ceiling_ft is None:
            ceiling_ft = raw_ceiling

    payload = {
        "error": None,
        "raw": raw_metar,
        "flight_category": _flight_category(ceiling_ft, visibility_sm),
        "station": metar.get("icaoId") or icao,
        "wind_dir": metar.get("wdir"),
        "wind_speed": metar.get("wspd"),
        "visibility": visibility_sm,
        "ceiling": ceiling_ft,
        "temp": _to_float(metar.get("temp")),
        "dewpoint": _to_float(metar.get("dewp")),
        "altimeter": _to_float(metar.get("altim")),
        "obs_time": _normalize_obs_time(metar.get("obsTime") or metar.get("reportTime")),
    }

    return payload


def _build_taf_payload(icao):
    records = _fetch_json(
        config.AVWX_TAF_URL,
        {"ids": icao, "format": "json"},
    )
    if not records:
        return _safe_taf_response()

    taf = records[0]
    raw = taf.get("rawTAF") or taf.get("raw")

    forecast_periods = []
    forecasts = taf.get("fcsts") or []
    for period in forecasts:
        forecast_periods.append(
            {
                "start": period.get("timeFrom"),
                "end": period.get("timeTo"),
                "wind_dir": period.get("wdir"),
                "wind_speed": period.get("wspd"),
                "gust": period.get("wgst"),
                "visibility": period.get("visib"),
                "clouds": period.get("clouds") or [],
                "weather": period.get("wxString"),
                "change_type": period.get("changeIndicator"),
            }
        )

    return {
        "error": None,
        "raw": raw,
        "station": taf.get("icaoId") or icao,
        "time": taf.get("issueTime") or taf.get("bulletinTime"),
        "forecast_periods": forecast_periods,
    }


@app.route("/")
def index():
    cam_ts = _get_flyweather_cam_timestamp()
    return render_template(
        "index.html",
        station=config.HOME_AERODROME,
        station_name=config.STATION_NAME,
        station_short=config.STATION_SHORT,
        camera_url=config.LPPR_CAMERA_URL,
        windy_embed_url=config.WINDY_EMBED_URL,
        ipma_briefing_url=config.IPMA_BRIEFING_URL,
        ipma_metar_taf_url=config.IPMA_METAR_TAF_URL,
        notam_viewer_url=config.NOTAM_VIEWER_URL,
        fpl_briefing_url=config.FPL_BRIEFING_URL,
        flyweather_sources=[
            {
                "label": "LPVL1 - Camera 31",
                "image_url": f"https://www.flyweather.net/cams/LPVL1/cam31.jpg?t={cam_ts}",
                "source_url": "https://www.flyweather.net/station.php?lang=en&station_id=31",
            },
            {
                "label": "LPVL2 - Camera 31",
                "image_url": f"https://www.flyweather.net/cams/LPVL2/cam31.jpg?t={cam_ts}",
                "source_url": "https://www.flyweather.net/station.php?lang=en&station_id=31",
            },
        ],
        aerodromes=[
            {
                **ad,
                "aip_url": ad.get("aip_url") or f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.{ad['icao']}-en-GB.html",
                "adc_pdf_url": ad.get("adc_pdf_url") or f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_{ad['icao']}-ADC_en.pdf",
                "vac_pdf_url": ad.get("vac_pdf_url") or f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_{ad['icao']}-VAC_en.pdf",
            }
            for ad in AERODROMES
        ],
    )


@app.route("/api/metar/<icao>")
def api_metar(icao):
    icao = (icao or "").upper().strip()
    key = f"metar:{icao}"

    cached = _cache_get(key)
    if cached:
        return jsonify(cached)

    try:
        payload = _build_metar_payload(icao)
    except requests.RequestException:
        return jsonify(_safe_metar_response())

    _cache_set(key, payload)
    payload["cached_at"] = _cache[key]["timestamp"].isoformat()
    return jsonify(payload)


@app.route("/api/taf/<icao>")
def api_taf(icao):
    icao = (icao or "").upper().strip()
    key = f"taf:{icao}"

    cached = _cache_get(key)
    if cached:
        return jsonify(cached)

    try:
        payload = _build_taf_payload(icao)
    except requests.RequestException:
        return jsonify(_safe_taf_response())

    _cache_set(key, payload)
    payload["cached_at"] = _cache[key]["timestamp"].isoformat()
    return jsonify(payload)


@app.route("/api/navigation/five-letter-code")
def api_navigation_five_letter_code():
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except (TypeError, ValueError):
        return jsonify({"error": "valid_lat_lng_required"}), 400

    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return jsonify({"error": "valid_lat_lng_required"}), 400

    point = _nearest_five_letter_code(lat, lng)
    if not point:
        return jsonify({"error": "five_letter_source_unavailable"}), 503
    return jsonify({"error": None, **point})


@app.route("/api/navigation/pdf", methods=["POST"])
def api_navigation_pdf():
    body = request.get_json(silent=True) or {}
    pdf = _build_navigation_log_template_pdf(body)
    return Response(
        pdf,
        mimetype="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="myflyapp-flightlog.pdf"'},
    )



@app.route("/api/fplbriefing/narrow-pib", methods=["POST"])
def api_fplbriefing_narrow_pib():
    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()
    payload = body.get("payload")

    if not token or not isinstance(payload, dict):
        return jsonify({"error": "token_and_payload_required"}), 400

    outbound_headers = {
        "Authorization": "Bearer ***",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://fplbriefing.nav.pt",
        "Referer": "https://fplbriefing.nav.pt/pib/narrow",
    }

    try:
        response = requests.post(
            FPLBRIEFING_PIB_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://fplbriefing.nav.pt",
                "Referer": "https://fplbriefing.nav.pt/pib/narrow",
            },
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        return jsonify(
            {
                "error": "fplbriefing_unreachable",
                "debug": {
                    "url": FPLBRIEFING_PIB_URL,
                    "request_headers": outbound_headers,
                    "request_payload": payload,
                },
            }
        ), 502

    if not response.ok:
        return jsonify(
            {
                "error": "fplbriefing_error",
                "status": response.status_code,
                "debug": {
                    "url": FPLBRIEFING_PIB_URL,
                    "request_headers": outbound_headers,
                    "request_payload": payload,
                    "response_text": response.text[:800],
                },
            }
        ), 502

    data = response.json()
    return jsonify(
        {
            "error": None,
            "pib_uid": data.get("PibUid"),
            "adep": ((data.get("Adep") or {}).get("Code")),
            "ades": ((data.get("Ades") or {}).get("Code")),
            "issued": (((data.get("NarrowRoutePIBHeader") or {}).get("Issued"))),
            "notam_count": len((((data.get("Adep") or {}).get("NotamList") or {}).get("Notam") or [])),
            "raw": data,
            "debug": {
                "url": FPLBRIEFING_PIB_URL,
                "status": response.status_code,
                "request_headers": outbound_headers,
                "request_payload": payload,
            },
        }
    )


@app.route("/api/fplbriefing/route-map", methods=["POST"])
def api_fplbriefing_route_map():
    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()
    route_id = (body.get("route_id") or "").strip()
    dep = (body.get("dep") or "").strip().upper()
    dest = (body.get("dest") or "").strip().upper()
    route = (body.get("route") or "").strip()

    if not token:
        return jsonify({"error": "token_required"}), 400

    if not route_id:
        if not dep or not dest:
            return jsonify({"error": "route_id_or_dep_dest_required"}), 400
        route_clean = (route or "DCT").strip().upper()
        route_part = "DCT%20" if route_clean == "DCT" else quote(route, safe="")
        if route_part and not route_part.endswith("%20") and route_clean == "DCT":
            route_part = f"{route_part}%20"
        route_encoded = route_part
        route_id = f"{dep}-%20{route_encoded}-{dest}"

    route_url = FPLBRIEFING_ROUTE_URL.format(route_id=route_id)
    try:
        response = requests.get(
            route_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://fplbriefing.nav.pt/pib/narrow/preview",
            },
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        return jsonify({"error": "fplbriefing_unreachable", "debug": {"route_id": route_id, "route_url": route_url}}), 502

    if not response.ok:
        return jsonify(
            {
                "error": "fplbriefing_error",
                "status": response.status_code,
                "debug": {"route_id": route_id, "route_url": route_url, "response_text": response.text[:500]},
            }
        ), 502

    return jsonify({"error": None, "geojson": response.json(), "debug": {"route_id": route_id, "route_url": route_url}})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
