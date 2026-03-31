# Product Brief: Todoist Daily Review

## Problem

Fazer daily/weekly review do GTD em cima do Todoist eh lento e cheio de fricao quando feito via Telegram bot. A latencia entre interacoes e bugs ocasionais fazem a review demorar mais do que deveria, desanimando o usuario de manter o habito.

## Solution

Web app responsivo que guia o usuario pela daily e weekly review do GTD, uma tarefa por vez, com acoes rapidas e senso de progresso. Interface pensada especificamente pro fluxo de review - nao eh um app de tarefas novo, eh uma camada de review em cima do Todoist.

## Target User

Pessoas que usam Todoist e seguem GTD (ou metodologias similares de review). Primeiro usuario: o proprio autor. Disponibilizado open source pra quem quiser.

## Value Proposition

Review fluida em ~2 minutos ao inves de 5-10 no Telegram. Zero latencia entre acoes. Progresso visivel.

## Core Features (v1)

### Auth
- OAuth Todoist para uso publico
- Opcao de API token para self-hosted

### Daily Review
- **Processar Inbox**: uma tarefa por vez, com acoes rapidas:
  - Mover pra projeto existente
  - Reagendar (hoje, amanha, sabado, proxima segunda, sem data)
  - Mover pra Someday/Maybe
  - Deletar
  - Completar
  - Pular
- **Revisar tarefas com filtro configuravel**: usuario define qual filtro usar (ex: `@next_action & (no date | overdue | today)` ou qualquer filtro Todoist)
  - Reagendar
  - Completar
  - Remover data
  - Pular
- **Barra de progresso** mostrando posicao na review

### Weekly Review
- Roteiro baseado no GTD:
  - Revisar cada projeto ativo
  - Verificar se projetos tem proxima acao definida
  - Arquivar projetos concluidos
  - Adicionar tarefas a projetos que precisam

## Out of Scope (for now)

- Adicionar tarefas novas durante a review
- Sugestoes de IA (projeto, priorizacao)
- Integracao com Google Calendar
- Daily log / narrativa do dia
- Notificacoes / cron automatico
- App nativo (mobile/desktop)

## Success Criteria

- Autor troca o agent do Telegram por este app e faz a review todo dia
- Daily review completa em menos de 3 minutos
- Zero fricao entre acoes (sem espera perceptivel)

## Open Questions

- Design detalhado do roteiro de weekly review (quais passos exatos do GTD incluir)
- Onde hospedar (homelab? Vercel? Fly?)
- Stack tecnica (a definir em tech-define)

## Risks

- Todoist API rate limits podem afetar fluidez se muitas acoes em sequencia
- OAuth Todoist requer aprovacao de app se quiser distribuir publicamente
- Manter paridade com o agent atual sem regredir features que o usuario usa sem perceber
