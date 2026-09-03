# Campeonato de eFootball — Soft UI

Painel web responsivo para gerenciamento do campeonato local de eFootball.

## Visual

Interface redesenhada em Soft UI, com fundo cinza-claro, cartões brancos, tipografia Inter/Montserrat, sombras suaves e destaque em violeta.

## Regras preservadas

- 5 participantes e seleções fixas
- 10 jogos na fase de liga, na ordem definida pelo campeonato
- Vitória 3 pts, empate 1 pt, derrota 0 pt
- Desempate por PTS → SG → GP → confronto direto
- Os 4 primeiros avançam
- Semifinal 1: 1º × 4º
- Semifinal 2: 2º × 3º
- Empate no mata-mata exige definição do vencedor nos pênaltis
- Vencedores das semifinais avançam automaticamente para a final
- Campeão definido automaticamente
- Edição de resultados com recálculo da classificação
- Persistência local dos resultados
- Backup e restauração
- PWA e funcionamento offline

## Assets das seleções

Os SVGs são nomeados pelos países:

- `assets/teams/portugal.svg`
- `assets/teams/franca.svg`
- `assets/teams/inglaterra.svg`
- `assets/teams/brasil.svg`
- `assets/teams/japao.svg`

## Publicação

O projeto é estático e pode ser publicado diretamente no GitHub Pages a partir da branch `main` e da pasta `/ (root)`.
