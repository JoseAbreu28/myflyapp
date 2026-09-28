# GNC 255A/B standalone mockup

Mockup visual e navegável, autónomo e fora do runtime do MyFlyApp. Não está ligado ao Flask, não usa dados reais, não guarda credenciais e não pretende reproduzir um equipamento certificado.

## Abrir

Abrir [`index.html`](index.html) diretamente num navegador. Não é necessário instalar dependências nem arrancar o site.

## Cobertura do manual

O protótipo usa como referência o [Garmin GNC 255A/255B Pilot's Guide, 190-01182-01 Rev. E](https://static.garmin.com/pumac/190-01182-01_e.pdf), consultado em 28-09-2026:

- **Painel e controlos** — `Getting Started`, páginas 1-1 a 1-3: knobs COM/NAV, knobs concêntricos de sintonia, C/N, OBS, T/F, FUNC, CLR, ENT, MON e FLIP/FLOP.
- **Operação COM** — páginas 2-1 a 2-6: frequência ativa/standby, monitorização, guardar canal, pesquisa/reverse look-up por base de dados, emergência 121.500, stuck mic e remote frequency recall.
- **Operação NAV** — páginas 2-6 a 2-8: sintonia NAV, guardar canal, áudio/ID NAV e OBS/CDI.
- **DST e TO/FROM** — página 2-9: bearing, distância, velocidade no solo e tempo até à estação.
- **Funções COM/NAV** — páginas 3-1 a 3-12: recentes, utilizador, base de dados e listas nearest APT/ACC/FSS/WX/VOR.
- **ICS** — páginas 3-13 a 3-15: intercom, AUX audio e speaker.
- **System Configuration** — páginas 3-16 a 3-20: espaçamento COM, sidetone, brilho, contraste, informação/base de dados, versão e número de série.
- **Timers** — páginas 3-21 a 3-22: count down, count up e prioridade do contador visível no ecrã COM/NAV.
- **Database e mensagens** — páginas 4-1 e 5-3 a 5-6: fluxo visual de atualização e estados de troubleshooting.

As ações são apenas mockups de layout: os valores são exemplos fixos ou locais ao protótipo e não constituem frequência operacional, informação de navegação ou instrução de voo.
