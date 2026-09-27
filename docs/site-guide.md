# MyFlyApp — documentação do site

## 1. Objetivo e limites

O MyFlyApp é um dashboard single-page para apoio ao planeamento e estudo de aviação geral/PPL em Portugal. Reúne meteorologia, NOTAM, mapas, planeamento de rota, cálculo E6B, navegação simulada, estudo de instrumentos, treino VOR, aviónica simulada e massa & balanceamento.

Todos os cálculos e indicações são educativos e de planeamento. Não substituem cartas e publicações oficiais, AIP/eAIP, NOTAM atuais, briefing operacional, instrumentos certificados, treino aprovado ou a decisão/responsabilidade do piloto.

## 2. Executar localmente

Requisitos:

- Python 3.12 (o Vercel usa `python3.12`; versões próximas podem funcionar localmente).
- Acesso à rede para METAR/TAF, mapas Leaflet, Windy, Flyweather e serviços externos.

No PowerShell, a partir da raiz do repositório:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Abrir `http://127.0.0.1:5000/`. O servidor Flask escuta apenas localmente por defeito. Não existe base de dados nem estado persistente da interface.

Verificações rápidas:

```powershell
python -c "import app; print('import OK')"
node --check static/js/app.js
node --check static/js/navigation.js
node --check static/js/avionics-simulator.js
```

## 3. Organização do site

O cabeçalho tem três tabs principais. Os hashes também funcionam como links diretos:

| Tab/hash | Conteúdo |
| --- | --- |
| `#dashboard` | Meteorologia, frequências, mapas externos, NOTAM e aeródromos civis. |
| `#flightplan` | Pré-voo, criação de plano, Navegações e Massa & Balanceamento. |
| `#training` | Instrumentos e Avionics Simulator. |

O seletor PT/EN é aplicado no browser através de `myflyapp-language`. A linguagem atualiza os textos estáticos e os textos renderizados pelos módulos; o estado da aviónica não é enviado para o servidor.

## 4. Dashboard

### Frequências e meteorologia

- Mostra o quadro de frequências do aeródromo inicial `LPPR` e permite selecionar outros aeródromos ou introduzir um ICAO.
- O METAR e o TAF são pedidos ao backend local, que consulta `aviationweather.gov`, normaliza os dados e apresenta estados indisponíveis sem quebrar a página.
- A categoria VFR/MVFR/IFR/LIFR é calculada a partir de visibilidade e teto. Deve ser confirmada na fonte oficial atual.
- A caixa rápida permite trocar o aeródromo usado para a consulta.

### Mapas e fontes externas

- **Fly DATA / Windy:** iframe Windy carregado de forma lazy, centrado em Portugal.
- **Mapa NOTAM:** embed externo com link de fallback.
- **Câmaras Flyweather:** imagens de LPVL; o timestamp é obtido pelo backend para evitar cache visual antigo.
- **Aeródromos civis:** mapa Leaflet com os aeródromos disponíveis. Cada marcador pode abrir cartas ADC, VAC e a página eAIP/NAV Portugal quando os links existirem.

Embeds e fontes externas podem ficar indisponíveis por bloqueio de rede, alterações do fornecedor ou ausência de dados. O site deve manter o link de saída ou uma mensagem de indisponibilidade.

## 5. Plano de voo

### Pré-voo

O painel reúne mapas de apoio, espaço aéreo CAVOK, mapa NOTAM e o acesso às fontes de briefing. Não valida a legalidade nem a atualidade operacional do voo.

### Criar plano

O construtor local permite preencher:

- aeronave, tipo de missão e circuito;
- partida, destino, alternante e data/hora;
- nível/altitude, PIC/instrutor e observações;
- intenção de consultar NOTAM/briefing.

O formulário pode enviar um Narrow Route PIB para o proxy fplbriefing quando o utilizador fornece um token de sessão. O token é enviado apenas no pedido atual e não deve ser guardado no servidor, em ficheiros ou no browser.

### Navegações

O subtab de navegação tem duas áreas:

1. **Navegações:** criação de rota entre aeródromos, pontos de rota, breaking points, alternante, referências visuais, cálculos por perna e simulação.
2. **E6B:** calculadora E6BX externa carregada quando o subtab é aberto, com link de fallback caso o iframe falhe.

O simulador de rota só fica disponível com pelo menos dois pontos. O avião pode avançar/pausar, usar velocidades configuráveis e seguir o próximo breaking point ou o destino final. O marcador também pode ser arrastado ao longo da rota; esse movimento atualiza distância, tempo e os instrumentos HSI/RMI/VOR.

O laboratório manual de instrumentos é independente da rota e começa com um exemplo válido. Permite alterar rumo, curso/OBS, bearings, CDI e TO/FROM para estudar as indicações sem alterar o plano.

### Exportação PDF

O botão de exportação envia a rota, pernas, E6B, alternante e referências para `/api/navigation/pdf`. O backend cria um PDF simples com disclaimer, rota e cálculos de apoio. Se o download falhar, o browser usa a impressão como fallback quando disponível.

### Massa & Balanceamento

O módulo calcula peso, momento, CG e envelope para os registos de aeronave configurados. As premissas de braço, limites, combustível e peso vazio vêm dos dados documentados no código e devem ser substituídas pelos valores reais da ficha de pesagem/POH aplicável.

## 6. Treino

### Instrumentos — treinador VOR

O treinador é independente da rota do Plano de voo:

- frequências de treino: `114.10` para Porto/PRT e `113.10` para Viseu/VIS;
- mapa Leaflet com avião arrastável e estações VOR;
- rumo magnético, OBS, CDI, bearing e radial aproximados;
- botões para centrar TO ou FROM;
- explicação textual sincronizada com a posição e a indicação.

Frequências inválidas apresentam NAV/OFF. A geometria é uma aproximação educativa e não representa DME, cobertura ou informação operacional certificada.

### Avionics Simulator — Setup 1

O Setup 1 simula dois G5 (PFD e HSI) e um GNS 430/430W. Os controlos são locais e não tentam reproduzir um trainer certificado Garmin.

Inclui:

- knobs físicos simulados para heading bug e HSI heading/course/OBS;
- menu do G5 HSI, seleção Heading/Course/OBS e sincronização do bug;
- GNS NAV/WPT/AUX/NRST, COM/VLOC, CDI, OBS, Direct-to, ENT, CLR, range e CRSR;
- mapa tutorial com avião, estações/waypoint, bearing, radial e distância;
- voo didático a 90 KTS, GO/PAUSA, rumo e curvas de 5 graus;
- modo livre sem objetivo nem conclusão automática.

Níveis guiados do Setup 1:

1. Viseu VOR — voar TO.
2. Viseu VOR — radial FROM.
3. Porto VOR — intercetar TO.
4. GPS — Direct-to LPPR.
5. GNS 430 — **Map Page**, inspirado na página de mapa do manual fornecido: NAV → MAP, alcance, símbolo de posição, waypoint e leitura `TRK`, `BRG`, `DTK`, `DIS` e `GS`.

### Avionics Simulator — Setup 2

O Setup 2 simula um GI-106A VOR/LOC e um GNC 255. Os quatro níveis são independentes do estado do Setup 1:

1. Sintonizar e identificar Viseu/VIS.
2. Configurar curso TO para Viseu.
3. Ler radial FROM em Viseu.
4. Mudar para Porto/PRT e repetir o método.

### Checklist de execução

A checklist global reúne os 5 níveis do Setup 1 e os 4 níveis do Setup 2. Cada linha permite abrir o nível correspondente. O botão **Confirmar execução** só fica ativo depois de os critérios automáticos do objetivo passarem; o progresso é apenas da sessão atual do browser e reinicia ao recarregar.

## 7. Backend e APIs

`app.py` é uma aplicação Flask sem base de dados. O estado de cache é apenas memória do processo e pode desaparecer num cold start do Vercel.

| Método | Endpoint | Função |
| --- | --- | --- |
| `GET` | `/` | Renderiza `templates/index.html` com configuração, aeródromos e links externos. |
| `GET` | `/api/metar/<icao>` | Consulta/normaliza METAR; usa cache curto e resposta indisponível em falha upstream. |
| `GET` | `/api/taf/<icao>` | Consulta/normaliza TAF; usa cache curto e resposta indisponível em falha upstream. |
| `POST` | `/api/navigation/pdf` | Recebe rota/E6B/referências e devolve `application/pdf`. |
| `POST` | `/api/fplbriefing/narrow-pib` | Proxy de PIB Narrow Route com token fornecido no body. |
| `POST` | `/api/fplbriefing/route-map` | Obtém GeoJSON de uma rota fplbriefing usando token request-scoped. |

Erros de validação usam normalmente HTTP `400`; falhas dos serviços externos usam `502` ou payload de indisponibilidade. Os pedidos fplbriefing devolvem campos de `debug` para diagnóstico; nunca devem incluir um token real em logs, commits ou capturas de ecrã.

Exemplo de teste sem iniciar o servidor:

```powershell
python -c "import app; c=app.app.test_client(); r=c.get('/'); print(r.status_code, len(r.data))"
```

## 8. Estrutura do repositório

```text
app.py                  Flask, proxies, normalização e PDF
config.py               Aeródromo inicial, URLs externas e timeouts
api/index.py            Adaptador WSGI para Vercel
templates/base.html     Shell, tabs, idioma, Leaflet e footer
templates/index.html    Markup completo da SPA
static/css/style.css    Tema, layout responsivo e impressão
static/js/app.js        Tabs, dashboard, METAR/TAF e inicialização
static/js/navigation.js Rotas, E6B, simulação, i18n e PDF
static/js/vor-trainer.js Treinador VOR
static/js/avionics-simulator.js G5/GNS/GI-106A/GNC 255
static/js/massbalance.js Massa, balanceamento e envelope CG
static/js/hsi.js        Classe de instrumento HSI
static/js/rmi.js        Classe de instrumento RMI
static/js/vor-indicator.js Indicador VOR
docs/                   Documentação durável e planos históricos
```

Os ficheiros `AGENTS.md` são contratos DOX de cada área e devem ser lidos antes de alterações estruturais.

## 9. Deploy no Vercel

O deploy usa:

- `runtime.txt` com Python 3.12;
- `vercel.json` com `api/index.py` como build Python e inclusão de `templates/`, `static/`, `app.py` e `config.py`;
- `api/index.py`, que expõe a aplicação Flask como `app` e `handler`.

Depois de autenticar o Vercel, a partir da raiz:

```powershell
vercel --prod
```

O GitHub pode ser ligado ao projeto Vercel para cada push à branch de produção gerar um deploy. O cache de METAR/TAF é em memória e não é persistente entre instâncias.

## 10. Segurança, privacidade e manutenção

- Não guardar tokens fplbriefing, passwords, hashes ou credenciais reais no repositório.
- Não assumir que frequências, cartas, METAR, TAF ou NOTAMs estão atuais só porque foram obtidos pelo site.
- Manter os avisos de segurança visíveis quando se alterarem templates ou estilos.
- Manter a implementação de aviónica claramente educativa e independente da base de dados/trainer certificado Garmin.
- Manter o frontend vanilla JS, sem build step, framework ou base de dados sem uma decisão de projeto explícita.
- Confirmar dependências de IDs/classes nos `AGENTS.md` locais antes de os renomear.

## 11. Verificação de release

Antes de publicar uma versão:

1. `python -c "import app; print('import OK')"`.
2. Confirmar que `/` devolve HTTP 200 e que CSS/JS principais carregam.
3. Testar Dashboard, Plano de voo, E6B, Navegações, Massa & Balanceamento, Instrumentos e os dois setups da aviónica.
4. Testar mudança PT/EN e uma viewport estreita.
5. Testar falha/disponibilidade de METAR/TAF e embeds externos quando possível.
6. Executar `git diff --check`, rever segredos e só depois fazer commit/push.

Planos históricos de implementação estão em `docs/plans/`; não substituem o comportamento atual descrito neste documento.
