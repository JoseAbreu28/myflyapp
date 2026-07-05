from datetime import datetime, timezone
from io import BytesIO
import textwrap
import re
from urllib.parse import quote

from flask import Flask, Response, jsonify, render_template, request
import requests

import config

app = Flask(__name__)
_cache = {}
_flyweather_cam_ts_cache = {"value": None, "timestamp": None}
_CEILING_RE = re.compile(r"\b(BKN|OVC|VV)(\d{3})\b")
_FLYWEATHER_CAM_TS_RE = re.compile(r"cam31\.jpg\?t=(\d+)")
FPLBRIEFING_PIB_URL = "https://fplbriefing.nav.pt/rest/api/create-narrow-route-pib"
FPLBRIEFING_ROUTE_URL = "https://fplbriefing.nav.pt/rest/api/rest/routes/route/{route_id}"


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

AERODROMES = [
    {"icao": "LPPT", "name": "Lisboa Humberto Delgado", "lat": 38.7742, "lon": -9.1342, "atis": "127.125", "main_freq": "118.100"},
    {"icao": "LPPR", "name": "Porto Francisco Sa Carneiro", "lat": 41.2481, "lon": -8.6814, "atis": "124.305", "main_freq": "120.910"},
    {"icao": "LPFR", "name": "Faro", "lat": 37.0144, "lon": -7.9659, "atis": "119.150", "main_freq": "118.030"},
    {"icao": "LPMA", "name": "Madeira Cristiano Ronaldo", "lat": 32.6979, "lon": -16.7745, "atis": "118.875", "main_freq": "118.350"},
    {"icao": "LPPS", "name": "Porto Santo", "lat": 33.0734, "lon": -16.3495, "atis": "N/A", "main_freq": "118.250"},
    {"icao": "LPAZ", "name": "Santa Maria", "lat": 36.9714, "lon": -25.1706, "atis": "N/A", "main_freq": "118.650"},
    {"icao": "LPPD", "name": "Ponta Delgada Joao Paulo II", "lat": 37.7412, "lon": -25.6979, "atis": "126.650", "main_freq": "118.800"},
    {"icao": "LPLA", "name": "Lajes", "lat": 38.7618, "lon": -27.0908, "atis": "N/A", "main_freq": "118.000"},
    {"icao": "LPHR", "name": "Horta", "lat": 38.5199, "lon": -28.7159, "atis": "N/A", "main_freq": "118.700"},
    {"icao": "LPPI", "name": "Pico", "lat": 38.5543, "lon": -28.4413, "atis": "N/A", "main_freq": "118.550"},
    {"icao": "LPSJ", "name": "Sao Jorge", "lat": 38.6655, "lon": -28.1758, "atis": "N/A", "main_freq": "118.400"},
    {"icao": "LPFL", "name": "Flores", "lat": 39.4553, "lon": -31.1314, "atis": "N/A", "main_freq": "118.900"},
    {"icao": "LPCR", "name": "Corvo", "lat": 39.6715, "lon": -31.1136, "atis": "N/A", "main_freq": "118.900"},
    {"icao": "LPGR", "name": "Graciosa", "lat": 39.0922, "lon": -28.0298, "atis": "N/A", "main_freq": "118.200"},
    {"icao": "LPEV", "name": "Evora", "lat": 38.5335, "lon": -7.8896, "atis": "N/A", "main_freq": "122.705"},
    {"icao": "LPCS", "name": "Cascais", "lat": 38.7250, "lon": -9.3552, "atis": "N/A", "main_freq": "118.700"},
    {"icao": "LPBJ", "name": "Beja", "lat": 38.0789, "lon": -7.9324, "atis": "N/A", "main_freq": "119.100"},
    {"icao": "LPMR", "name": "Monte Real", "lat": 39.8283, "lon": -8.8875, "atis": "N/A", "main_freq": "122.100"},
    {"icao": "LPVL", "name": "Vilar de Luz", "lat": 41.2792, "lon": -8.5172, "atis": "N/A", "main_freq": "122.405"},
    {"icao": "LPVZ", "name": "Viseu", "lat": 40.7255, "lon": -7.8889, "atis": "N/A", "main_freq": "122.505"},
    {"icao": "LPBR", "name": "Braga", "lat": 41.5871, "lon": -8.4451, "atis": "N/A", "main_freq": "123.255"},
    {"icao": "LPVR", "name": "Vila Real", "lat": 41.2743, "lon": -7.7205, "atis": "N/A", "main_freq": "123.505"},
    {"icao": "LPCH", "name": "Chaves", "lat": 41.7224, "lon": -7.4667, "atis": "N/A", "main_freq": "123.255"},
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
                "aip_url": f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/html/eAIP/LP-AD-2.{ad['icao']}-en-GB.html",
                "adc_pdf_url": f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_{ad['icao']}-ADC_en.pdf",
                "vac_pdf_url": f"https://ais.nav.pt/wp-content/uploads/AIS_Files/eVFR_Current/eVFR_Online/eAIP/graphics/eAIP/LP_AD_2_{ad['icao']}-VAC_en.pdf",
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


@app.route("/api/navigation/pdf", methods=["POST"])
def api_navigation_pdf():
    body = request.get_json(silent=True) or {}

    route_rows = []
    for leg in body.get("legs") or []:
        altitude = leg.get("altitude") or "-"
        status = leg.get("altitude_status") or ""
        route_rows.append(
            f"Leg {leg.get('label', '-')}: {leg.get('nm', '-')} NM | "
            f"HDG {leg.get('heading', '-')} | ALT {altitude} {status}".strip()
        )
    if not route_rows:
        route_rows.append("Sem pernas de rota definidas.")

    e6b = body.get("e6b") or {}
    e6b_rows = [
        f"Distancia: {e6b.get('nm', '-')}",
        f"Tempo: {e6b.get('time', '-')}",
        f"Combustivel rota: {e6b.get('fuel', '-')}",
        f"Com reserva: {e6b.get('fuel_reserve', '-')}",
        f"Metros -> ft: {e6b.get('feet', '-')}",
    ]

    ref_rows = []
    for idx, ref in enumerate(body.get("references") or [], start=1):
        altitude = f" | Altitude: {ref.get('altitude')}" if ref.get("altitude") else ""
        note = ref.get("note") or "Sem observacoes."
        ref_rows.append(f"{idx}. {ref.get('title') or 'Ref'}{altitude}")
        ref_rows.append(f"   {note}")
        if ref.get("lat") is not None and ref.get("lng") is not None:
            ref_rows.append(f"   Coordenadas: {ref.get('lat')}, {ref.get('lng')}")
    if not ref_rows:
        ref_rows.append("Sem pontos de referencia.")

    disclaimer = (
        "Ferramenta de apoio. Nao substitui carta aeronautica oficial, AIP/eAIP, NOTAM, "
        "informacao de espaco aereo, altitudes minimas, obstaculos, terreno ou briefing operacional."
    )
    pdf = _build_simple_pdf(
        "MyFlyApp - Report de Navegacao",
        [
            ("Disclaimer", [disclaimer]),
            ("Rota", route_rows),
            ("E6B", e6b_rows),
            ("Pontos de referencia", ref_rows),
        ],
    )
    return Response(
        pdf,
        mimetype="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="myflyapp-navegacao.pdf"'},
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
