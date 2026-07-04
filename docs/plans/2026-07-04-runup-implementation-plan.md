# RunUp — Plano de Implementação do MVP

**Data:** 2026-07-04
**Base:** [2026-07-04-runup-design.md](./2026-07-04-runup-design.md)
**Status:** Plano proposto

---

## Objetivo do MVP

Validar o **loop de valor central**:

> Treinador planeja um treino → atribui a um aluno → o aluno vê no calendário, **executa fora do app e confirma** (check manual ou import do Strava) → treinador acompanha planejado × realizado.

> **Nota de produto:** o RunUp **não rastreia corrida** (sem GPS/gravação ao vivo). A execução é externa; o app é online-first. Isso elimina GPS e sync offline complexo do escopo.

Mais o **diferencial** (importação de planilha com IA) e a **monetização** (assinatura por faixa de alunos).

### Escopo — o que entra no MVP

| Área | Dentro do MVP | Fora (fase 2+) |
|---|---|---|
| Auth | Email + Google + Strava (login) | Sign in with Apple (só antes de publicar iOS) |
| Papéis | student / coach (papel único) | — |
| Vínculo | Treinador convida → aluno aceita | Marketplace de descoberta/busca de treinadores |
| Planos | Criar plano custom no app + atribuir | Planos genéricos prontos do RunUp |
| Treino | Blocos (running / strength / mobility / free) | Biblioteca de exercícios com mídia/gif rica |
| Execução | Calendário + **check de conclusão** (manual) + **import Strava** | Rastreamento GPS/gravação ao vivo (fora do produto) |
| Import Excel | Pipeline completo com tela de revisão | — |
| Perfil | Métricas corporais + RPs (5/10/21/42k) manuais | Gráficos avançados / insights |
| Meta | Definição da prova + **página da meta** (treino por semanas) | Ajuste automático do plano por feedback |
| Feedback | RPE + dores + texto livre no check | Alertas automáticos ao treinador por dor recorrente |
| Engajamento | **Streak** (pílula de dias seguidos) + **alerta de treinos pulados** ao treinador | Gamificação (conquistas, ranking) |
| Mensagens | Chat 1:1 treinador↔aluno | Notificações push ricas, mídia no chat |
| Assinatura | Faixas (1-2 free / 3-6 / 7+) + bloqueio no backend | Trials, cupons, faturamento anual |

**Princípio YAGNI:** o marketplace aberto de descoberta e os planos genéricos ficam para depois — no MVP o aluno chega **por convite de um treinador**. Isso remove telas de busca/matching e ainda entrega o loop completo.

---

## Ordem de construção (milestones)

Cada milestone é entregável e testável antes do próximo. Dependências respeitadas.

### M0 — Fundação do monorepo
**Meta:** esqueleto rodando localmente.
- pnpm workspaces + Turborepo
- `packages/types`, `packages/core`, `packages/db` (Prisma + Postgres via Docker), `packages/api` (Fastify)
- `apps/mobile` (Expo) e `apps/web` (Next.js) com tela "hello" batendo na API
- Lint, tsconfig compartilhado, Vitest configurado, CI básico (typecheck + test)

**Saída:** `pnpm dev` sobe API + web + mobile; um endpoint de health responde.

### M1 — Auth & papéis
**Meta:** usuário se cadastra, entra e tem papel.
- Modelo `User` + Prisma migration
- Cadastro por email/senha + Google OAuth
- JWT (access curto) + refresh token rotacionado
- Escolha de papel (student/coach) no cadastro
- Middleware de autorização base
- Testes de integração: cadastro, login, refresh, acesso negado sem token

**Saída:** login funcional nos dois clientes; rota protegida.

### M2 — Vínculo treinador↔aluno + assinatura
**Meta:** treinador conecta alunos, respeitando o tier.
- `CoachStudent` (convite → aceite) + `Subscription`
- Regra de faixa no `packages/core` (1-2 free / 3-6 / 7+) validada no backend ao ativar aluno
- Gateway de pagamento (Stripe ou Pagar.me) — checkout + webhook de status
- Dashboard web: lista de alunos, convidar aluno, ver tier atual
- Testes: ativar 3º aluno no free → bloqueio; upgrade libera

**Saída:** treinador convida, aluno aceita, cobrança respeita as faixas.

### M3 — Planos & treinos (núcleo)
**Meta:** treinador cria e atribui treino; aluno vê e **confirma execução**.
- `Plan`, `PlanAssignment`, `WorkoutDay`, `Block`, `BlockItem`, `Exercise`, `WorkoutLog`
- Web: construtor de plano (dias + blocos: running/strength/mobility/free)
- Mobile aluno: **calendário semanal**, tela do dia, **check de conclusão** com **feedback** (`WorkoutLog source=manual`): distância/tempo opcionais + `perceivedEffort` (RPE), `pain` (dores) e `notes` (feedback livre)
- `Goal` (prova alvo) definida por aluno+treinador + **página da meta** (visão macro: todo o treino separado por semanas, com progresso rumo à `raceDate`)
- Testes: geração de `WorkoutDay`s, autorização (aluno A não vê plano do B)

**Saída:** loop de valor central (planejar → atribuir → confirmar) completo ponta a ponta.

### M3.5 — Integração Strava
**Meta:** aluno conecta o Strava e a execução vira automática.
- `StravaConnection` (OAuth do Strava, tokens, refresh)
- Webhook/pull de atividades → casar com `WorkoutDay` planejado → gerar `WorkoutLog source=strava`
- Atividade sem treino planejado → guardada como avulsa
- Import de `PersonalRecord` a partir do histórico do Strava
- Testes: casamento atividade↔dia, token expirado/revogado

**Saída:** aluno com Strava fecha o ciclo planejado × realizado sem digitar nada.

### M4 — Importação de Excel com IA
**Meta:** treinador sobe planilha livre e vira plano.
- `packages/api/src/excel-import/`: SheetJS → matriz → Claude → JSON (Zod) → revisão → persistência
- Web: upload + **tela de revisão editável** com destaque de baixa confiança
- Fixtures de planilhas reais + testes de contrato (Zod sempre valida)

**Saída:** planilha do treinador vira `Plan` atribuível.

### M5 — Perfil, progresso & mensagens
**Meta:** acompanhamento e comunicação.
- `BodyMetric` + `PersonalRecord` (entrada manual; os RPs do Strava já vêm do M3.5) e agregações do `WorkoutLog`
- Perfil do aluno: RPs por distância, evolução de métricas, corridas
- **Streak:** cálculo de dias seguidos ativos + **pílula visual** no app do aluno
- **Monitor de aderência:** job agendado que detecta N treinos pulados em sequência → **alerta ao treinador** (dashboard + push/email)
- `Message`: chat 1:1 dentro do vínculo (canal reusado pelos alertas)
- Testes E2E dos fluxos-chave (import→atribuir, executar→confirmar, limite free→upgrade, chat, alerta de treinos pulados)

**Saída:** MVP completo e testado, pronto para beta.

---

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Parser de Excel impreciso | Tela de revisão humana obrigatória; testar contrato, não igualdade exata |
| Custo/latência da IA no import | Cache por planilha; extração determinística antes de chamar o modelo |
| Regras de assinatura burladas no cliente | Validação sempre no backend; nunca confiar no app |
| Revisão da App Store (login social) | Adicionar Sign in with Apple antes de submeter iOS |
| Escopo inflar | Marketplace de descoberta e planos genéricos ficam fora do MVP |

---

## Sequência recomendada de trabalho

1. **M0** (fundação) — bloqueia tudo, fazer primeiro.
2. **M1 → M2 → M3** em ordem (dependências diretas).
3. **M3.5 (Strava)** logo após o M3 — depende do `WorkoutLog`/`WorkoutDay` estáveis.
4. **M4** pode começar em paralelo ao M3 assim que o schema de `Block`/`BlockItem` estiver estável.
5. **M5** por último, depois valida com E2E.

**Primeiro passo concreto:** iniciar o **M0** — montar o monorepo (pnpm + Turborepo + os packages base). É o desbloqueador de todo o resto.
