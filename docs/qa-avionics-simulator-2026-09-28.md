# QA — Treino > Avionics Simulator

Data: 2026-09-28  
Âmbito: Setup 1 (2× G5 + GNS 430/430W) e Setup 2 (GI-106A + GNC 255).  
Ambiente: aplicação Flask local em `http://127.0.0.1:5000/`, Chrome via browser harness, viewport desktop.

## Resultado

Foram encontrados 2 bugs funcionais no Setup 1 e ambos foram corrigidos. O Setup 2 passou a matriz de VORs, a alternância TO/FROM, a deslocação do avião e o orbitamento por teclado. Os resultados abaixo são relativos ao simulador educativo e não validam navegação operacional.

## Bugs registados

### BUG-AV-001 — Mapa do Setup 1 renderiza apenas uma faixa e calcula posições erradas

- Severidade: alta — impede validar visualmente a relação avião/VOR/DME no Setup 1.
- Estado: corrigido e retestado.
- Pré-condição: abrir `Treino > Avionics Simulator > Setup 1` e deslocar até ao mapa do tutorial.
- Passos:
  1. Abrir o mapa do Setup 1 pela primeira vez.
  2. Clicar no centro da área visível do mapa.
  3. Alternar para Setup 2 e voltar a Setup 1; repetir a observação.
- Esperado: mapa preenchido com tiles, marcadores e linha na área visível; o ponto clicado deve corresponder à posição geográfica mostrada.
- Obtido: o elemento tem aproximadamente `694×430 px`, mas os panes internos Leaflet ficam `0×0` e só existe 1 tile. O restante mapa fica vazio/preto. Um clique na área visível produziu `40.225°, -6.412°`, sem correspondência visual com a área clicada; os marcadores ficam encostados à faixa superior.
- Regressão observada também depois de voltar do Setup 2 para Setup 1.
- Evidência: [mapa Setup 1 com renderização quebrada](qa-avionics-2026-09-28-map.png).
- Área provável: inicialização do `tutorialMap` enquanto o painel está sem layout; o `invalidateSize()` existente só é agendado na criação e não há equivalente ao reabrir Setup 1.

### BUG-AV-002 — Distância do G5/GNS continua a seguir LPPR quando a fonte é VLOC

- Severidade: média-alta — pode induzir uma leitura errada durante o treino de VOR/DME.
- Estado: corrigido e retestado.
- Pré-condição: Setup 1 em `Modo livre`, posição `40.225°, -6.412°`, fonte `VLOC`, VLOC ativa `114.30` (CAS).
- Passos:
  1. Sintonizar CAS `114.30` como VLOC ativa.
  2. Selecionar a fonte CDI `VLOC`.
  3. Comparar a distância da referência CAS no painel do tutorial com `DIST NM` no HSI/GNS.
- Esperado: com VLOC selecionada, a distância deve seguir a estação VOR/DME sintonizada ou ser explicitamente identificada como distância GPS para LPPR.
- Obtido: o mapa/tutorial mostra CAS a `162.9 NM`, mas o HSI e o NAV 1 do GNS mostram `DIST NM 120.1` e `LPPR`; o valor não acompanha a estação VOR ativa.
- Evidência: [distância CAS versus distância LPPR apresentada](qa-avionics-2026-09-28-distance.png).

## Matriz executada

### Setup 1

- VORs alternados: VIS `113.10`, PRT `114.10`, CAS `114.30`, VFA `112.80`, FTM `113.50` e LIS `114.80`.
- Resultado: a referência do modo livre e a indicação VLOC/TO/FROM acompanharam a frequência válida; `110.30` produziu `NAV OFF`.
- Na execução inicial, o BUG-AV-001 impediu confirmar a posição através do mapa do Setup 1; o reteste abaixo confirmou a correção.

### Setup 2

- Todos os VORs acima deram `ID OK` e atualizaram a referência do mapa, radial/bearing e CDI.
- `113.15` deu `NAV · ID OFF` e CDI `OFF`.
- DAR/Arouca `CH 96X` e DMR/Marão `CH 93X` foram localizados no mapa sem gerar indicação VOR, conforme esperado para referências DME-only.
- No exercício VIS TO: posição inicial `bearing 090° / radial 270° / CDI CENTER`; após deslocar o avião, os valores mudaram para `bearing 348° / radial 168° / CDI RIGHT`.
- No exercício VIS FROM: posição inicial `bearing 270° / radial 090° / CDI CENTER`.
- As setas ←/→ no mapa mantiveram a distância em `15.9 NM` e rodaram o radial em `5°`.
- Evidência: [Setup 2 após deslocação do avião](qa-avionics-2026-09-28-setup2-pass.png).

## Reteste após correção

- Setup 1 aberto e reaberto depois do Setup 2: mapa preenchido, com tiles, marcadores e linha de referência; o clique no mapa atualizou a posição para `40.277°, -7.109°`, coerente com a área clicada.
- Setup 1 em modo livre, CAS `114.30`, fonte `VLOC`: tutorial, HSI e GNS mostraram `DME NM 139.0`, com a referência CAS; a distância deixou de seguir LPPR/GPS.
- VLOC inválido `110.30`: HSI `NAV OFF`, GNS `DME NM ---` e bearing `---`.
- Setup 2 em `VIS TO`, Porto `114.10`: mapa preenchido, `ID OK`, indicação `TO` e CDI atualizados; a regressão não foi observada.
- Evidências adicionais de reteste: `fix-map-initial.png`, `fix-map-after-return.png`, `fix-vloc-dme-after-cdi.png` e `fix-setup2-vis-to.png` foram guardadas fora do repositório durante a sessão.

## Verificações técnicas

- `python -c "import app; print('import OK')"` — passou (`import OK`).
- `node --check static/js/avionics-simulator.js` — passou.
- A SPA abriu e as duas configurações foram renderizadas sem erro visível de template.

As correções foram aplicadas em `static/js/avionics-simulator.js` e `static/js/gns430-display.js`; este documento mantém o histórico dos bugs e regista o reteste aprovado.
