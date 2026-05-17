# MyflyApp

Disponível em [myflyapp.vercel.app](https://myflyapp.vercel.app)


## Features

- **METAR / TAF** — dados meteorológicos em tempo real via proxy server-side (aviationweather.gov)
- **Mapa meteorológico** — mapa interactivo tipo Windy centrado em Portugal
- **NOTAMs** — visualizador de NOTAMs integrado com filtro de rota via fplbriefing.nav.pt
- **Flight Plan** — consulta de PIB (Pre-flight Information Bulletin) por rota
- **Categoria de voo** — indicador VFR / MVFR / IFR / LIFR calculado automaticamente
- **Relógio UTC** — sincronizado em tempo real
- **Single Page App** — navegação por tabs sem recarregar a página

## Stack

Python · Flask · Vercel (serverless) · Vanilla JS

---

## Screenshots

O objetivo foi reunir o máximo de informação de diversas fontes num único lugar.

![Fly DATA — mapa Windy, NOTAM map e câmeras Flyweather](image2.png)

![Pre-flight Dashboard — mapa de aeródromos, espaço aéreo CAVOK e mapa NOTAM](image3.png)

---

Foi também integrada informação que vai buscar as cartas oficiais ao NAV Portugal. Os mesmos podem estar desatualizados.

![Cartas ADC/VAC oficiais via NAV Portugal](image1.png)

---

Na versão local é possível ir automaticamente buscar o Narrow Route NOTAM via fplbriefing.nav.pt.

![NOTAM Narrow Route via fplbriefing (versão local)](image4.png)
