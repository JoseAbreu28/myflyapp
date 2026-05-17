# MyflyApp

Dashboard de planeamento de voo para pilotos PPL EASA. Agrega informação aeronáutica portuguesa numa única página.

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

## Deploy

Disponível em [myflyapp.vercel.app](https://myflyapp.vercel.app)
