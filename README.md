# Campeonato de eFootball — Soft UI

Painel web responsivo para gerenciamento do campeonato local de eFootball.

## Visual

Interface redesenhada em Soft UI, com fundo cinza-claro, cartões brancos, tipografia Inter/Montserrat, sombras suaves e destaque em violeta.

## Funcionalidades dinâmicas

- Inscrição de jogadores com nome e seleção exclusiva
- Acesso ao próprio perfil no aparelho e troca de seleção antes do início
- Sorteio automático em turno único (todos contra todos)
- Quantidade de partidas calculada conforme o número de inscritos
- Calendário dividido em rodadas, com suporte a folga quando o total é ímpar
- Inscrições bloqueadas após o primeiro resultado para preservar a consistência
- Migração automática dos dados locais da versão anterior

## Regras do campeonato

- Até 32 participantes por sala no modo online
- Confrontos gerados automaticamente a partir de 2 participantes
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

## Persistência

No modo local, inscrições, identidade e resultados continuam no `localStorage` do navegador. O modo online descrito abaixo usa Supabase para compartilhar o campeonato entre aparelhos.

## Modo online com Supabase

O projeto agora também inclui `online.html`, uma experiência multiusuário separada do modo local:

- criação de campeonato por um organizador;
- código e link individual de convite;
- autenticação anônima por navegador;
- inscrição com clube ou seleção exclusiva por participante;
- escolha prévia entre campeonato brasileiro e europeu;
- catálogo filtrado com os 20 clubes da Série A ou 30 destaques europeus, sem misturar categorias na mesma sala;
- sala de participantes atualizada automaticamente;
- sorteio protegido, disponível somente ao organizador;
- placares e classificação compartilhados entre aparelhos.

Para ativar:

1. Em um projeto novo, execute `supabase/02_online.sql` e depois `supabase/05_security_hardening.sql`. Se o projeto já estava configurado, execute `supabase/04_competition_type.sql` quando necessário e, por último, `supabase/05_security_hardening.sql`.
2. Ative **Anonymous Sign-Ins** em Authentication.
3. Preencha `config.js` somente com a Project URL e a Publishable key.
4. Publique o projeto em HTTPS e abra `online.html`.

O endurecimento de segurança mantém convites de seis caracteres, aumenta o espaço de combinações, limita tentativas de localizar/entrar/criar salas e remove endpoints legados. CAPTCHA permanece opcional para este uso restrito entre amigos.

Nunca use no frontend `service_role`, `sb_secret_*`, senha do banco ou tokens administrativos. As tabelas online não concedem acesso direto ao navegador; as operações passam por funções com validação de identidade e de organizador.

## Estado do modo local

O modo local está preservado em `app2.js` e no conteúdo legado de `index.html`, mas permanece desativado. A página inicial mostra um aviso e direciona para `online.html`; o PWA também inicia diretamente no modo online.

## Assets dos times

Os SVGs das seleções são nomeados pelos países. Os clubes usam emblemas estilizados com siglas e cores, gerados pelo próprio frontend:

- `assets/teams/portugal.svg`
- `assets/teams/franca.svg`
- `assets/teams/inglaterra.svg`
- `assets/teams/brasil.svg`
- `assets/teams/japao.svg`

## Publicação

O projeto é estático e pode ser publicado diretamente no GitHub Pages a partir da branch `main` e da pasta `/ (root)`.
