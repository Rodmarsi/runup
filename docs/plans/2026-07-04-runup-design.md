# RunUp — Documento de Design

**Data:** 2026-07-04
**Status:** Design validado, pronto para planejamento de implementação

---

## 1. Visão do produto

**RunUp** é um app de **treinos guiados de fitness** (corrida + força + mobilidade) com um marketplace de dois lados:

- **Aluno** — executa os treinos **por fora do app** (o RunUp não rastreia corrida). No app ele apenas **confirma a execução** (check) ou **conecta o Strava** para importar a atividade automaticamente. Acompanha progresso e pode usar planos prontos ou ser acompanhado por um treinador.
- **Treinador** — planeja treinos para seus alunos, direto no app ou subindo uma planilha Excel que ele já usa.

> **Importante:** o RunUp **não é um rastreador (GPS/gravação ao vivo)**. É uma ferramenta de **planejamento + acompanhamento**. A execução acontece fora do app; o aluno confirma o que fez (manual ou via Strava). Isso torna o mobile online-first e dispensa GPS e sync offline de corrida ao vivo.

**Modelo:** marketplace híbrido. O aluno pode se cadastrar sozinho e usar planos genéricos como porta de entrada, e também escolher/contratar um treinador dentro do app.

**Plataformas:**
- Aluno → app mobile (iOS + Android)
- Treinador → app mobile (iOS + Android) **+** dashboard web para planejar e importar planilhas

**Papéis:** cada usuário é **ou aluno ou treinador** (um único papel por conta).

---

## 2. Arquitetura de alto nível

Monorepo TypeScript com tipos compartilhados de ponta a ponta.

```
runup/
├── apps/
│   ├── mobile/          # React Native (Expo) — aluno + treinador
│   └── web/             # Next.js — dashboard do treinador
├── packages/
│   ├── api/             # Backend Node (Fastify)
│   │   └── src/excel-import/   # Pipeline de importação de Excel com IA (isolado)
│   ├── db/              # Schema Postgres + migrations (Prisma)
│   ├── core/            # Regras de negócio (treinos, planos, vínculos, assinatura)
│   ├── types/           # Tipos compartilhados (fonte da verdade do modelo)
│   └── ui/              # Componentes/tokens de design compartilhados
```

**Ferramentas base:** pnpm workspaces + Turborepo · Fastify · Prisma · PostgreSQL · Expo · Next.js.

**Fluxo geral:** os dois clientes falam com uma única API que acessa o Postgres. O pacote `types` é a fonte da verdade do modelo — um "treino" tem exatamente a mesma forma no mobile, na web e no banco.

**Serviço de IA para Excel:** isolado em `packages/api/src/excel-import/`, atrás de uma interface, para evoluir/testar sem afetar o resto.

---

## 3. Modelo de dados

### Pessoas & vínculos
- **User** — id, nome, email, `role` (`student` | `coach`), perfil. Papel único e definido no cadastro.
- **CoachStudent** — vínculo treinador↔aluno. Status: `pending` | `active` | `ended`. Sustenta o marketplace (um treinador tem vários alunos; um aluno tem no máximo um treinador ativo).

### Conteúdo de treino
- **Plan** — `ownerId`, `type` (`generic` = pronto do RunUp | `custom` = feito por treinador), duração, objetivo.
- **PlanAssignment** — atribui um `Plan` a um aluno (por treinador ou auto-atribuído no caso genérico). Guarda data de início.
- **WorkoutDay** — um dia dentro do plano (ex.: "Semana 2, Terça"). Ordem/data e status (`pending` | `done` | `skipped`).
- **Block** — bloco dentro do dia. `kind`: `running` | `strength` | `mobility` | `free`.
- **BlockItem** — item concreto do bloco:
  - `running` → distância/tempo, ritmo alvo, tipo (fácil/tiro/longo)
  - `strength` / `mobility` → referência a `Exercise` + séries/reps/carga
  - `free` → texto livre (`notes`)
- **Exercise** — biblioteca compartilhada (nome, grupo muscular, mídia/gif).

### Execução & progresso do aluno
- **WorkoutLog** — **confirmação de execução** de um `WorkoutDay`. Não é uma corrida gravada no app; é o registro de que o aluno fez (ou pulou) o treino. Fonte:
  - `source = manual` → o aluno dá o check, opcionalmente com distância/tempo digitados.
  - `source = strava` → a atividade é importada do Strava e casada com o `WorkoutDay` planejado (distância, ritmo, tempo vêm prontos).
  - **Feedback do aluno (em qualquer fonte):** ao dar o check, o aluno pode registrar:
    - `perceivedEffort` (RPE / sensação de esforço, ex.: escala 1–10)
    - `pain` (dores/desconfortos — texto e/ou local do corpo)
    - `notes` (feedback livre sobre o treino)
  - Esse feedback é visível ao treinador e é insumo para ajustar o planejamento. Serve para comparar **planejado × realizado**.
- **StravaConnection** — vínculo do aluno com o Strava: tokens OAuth, `athleteId`, status. Alimenta `WorkoutLog` e `PersonalRecord` automaticamente.

### Aderência & engajamento (derivado de WorkoutLog)
- **Sequência de atividade (streak):** nº de dias seguidos em que o aluno esteve ativo (treino concluído). Calculado a partir do `WorkoutLog`, exibido no app do aluno como uma **pílula visual** (ex.: "🔥 7 dias") — elemento motivacional.
- **Monitor de aderência:** um verificador observa `WorkoutDay`s planejados que passam sem `WorkoutLog` (pulados). Ao detectar **N treinos pulados em sequência** (N configurável, ex.: 3), dispara um **alerta ao treinador** (no dashboard + push/email) para que ele intervenha. Roda como job agendado, não em tempo real.
- Não são entidades novas: streak e aderência são **cálculos** sobre `WorkoutDay` + `WorkoutLog`. O alerta pode reusar o canal de notificação/`Message`.
- **BodyMetric** — histórico corporal (peso, %gordura, medidas, data). Série temporal para gráficos.
- **PersonalRecord (PR)** — melhores tempos por distância (5k, 10k, 21k, 42k): `distance`, `time`, `achievedAt`.

### Metas
- **Goal** — definida em conjunto por aluno e treinador: `targetRace` (5k/10k/21k/42k/outro), `raceDate`, `targetTime`, status. Vincula-se ao aluno e opcionalmente a um `Plan`. É o "norte" do planejamento.
- **Página da meta (visão macro):** cada `Goal` gera uma tela que mostra **todo o treino do plano separado por semanas** — uma visão de periodização para acompanhar o progresso rumo à meta. Não é entidade nova; é uma **visão** que agrupa os `WorkoutDay` do `Plan` vinculado por semana, mostrando por semana: volume planejado, o que já foi concluído (via `WorkoutLog`) e quanto falta até a `raceDate`. Aluno e treinador veem a mesma página.

### Comunicação
- **Message** — chat 1:1 treinador↔aluno: `senderId`, `coachStudentId` (a conversa vive dentro do vínculo), `text`, `sentAt`, `readAt`.

### Assinatura (do treinador)
- **Subscription** — cobrança por faixa de nº de alunos **ativos**:
  - **1–2 alunos → Grátis**
  - **3–6 alunos → R$ 69,90/mês**
  - **7+ alunos → R$ 149,90/mês**
  - Campos: `coachId`, `tier`, `status`, `currentPeriodEnd`, integração com gateway (Stripe/Pagar.me).

### Calendário
Não é entidade — é uma **visão** sobre `WorkoutDay` (cada dia tem data). Funciona igual quando quem planeja é o treinador ou o próprio aluno (auto-plano), pois ambos geram os mesmos `WorkoutDay`.

**Chave do design:** o `Block` com `kind` + `BlockItem` flexível cobre corrida, força/mobilidade estruturada e texto livre — e é o alvo do parser de Excel.

---

## 4. Importação de Excel com IA

O treinador sobe a planilha que já usa (formato livre); o RunUp a transforma em `WorkoutDay` → `Block` → `BlockItem`.

1. **Upload & extração** — dashboard web envia o `.xlsx`; backend usa SheetJS para ler as células em matriz bruta (abas + posição preservadas). Determinístico e barato, sem IA.
2. **Interpretação com IA (Claude)** — a matriz + o schema-alvo do RunUp + a `Goal` do aluno viram um prompt; o modelo retorna **JSON estrito** mapeando linhas → dia/bloco/item, inferindo colunas ("Dist", "Pace", "Séries") e distinguindo corrida × força × texto livre.
3. **Validação** — JSON validado com **Zod** contra o schema. Linhas ambíguas/baixa confiança são marcadas, não descartadas.
4. **Tela de revisão (humano no comando)** — preview editável do plano interpretado, com destaque no que a IA teve dúvida. O treinador corrige e confirma. A IA faz ~90%; o treinador valida os 10%.
5. **Persistência** — ao confirmar, gera `Plan` + `WorkoutDay`s reais, prontos para atribuir.

**Isolamento:** tudo em `packages/api/src/excel-import/`, com o chamador de IA atrás de uma interface (troca de modelo, cache e testes com fixtures sem afetar o resto).

---

## 5. Autenticação, papéis e autorização

### Login
- **Google**, **Strava** e **cadastro por email pessoal**.
- Tokens **JWT** de acesso (curtos) + **refresh token** (longo, rotacionado).
- **Integração Strava (parte do loop de valor, não fase 2):** conectar o Strava permite importar automaticamente as atividades e casá-las com o `WorkoutDay` planejado (fecha o ciclo planejado × realizado sem digitação), além de alimentar `PersonalRecord`. Ver `StravaConnection` no modelo de dados. O check manual continua como alternativa para quem não usa Strava.
- **Requisito de publicação (iOS):** a Apple exige "Sign in with Apple" quando há login social; adicionar **apenas no build iOS**.

### Papéis
- `User.role` é **único** (`student` ou `coach`), definido no cadastro. Sem seletor de modo.
- Se um treinador quiser treinar como aluno, precisará de outra conta (aceitável no MVP).

### Autorização (regras críticas)
- Acesso a dados de treino sempre checa vínculo: treinador só lê/edita alunos com `CoachStudent.status = active`.
- Aluno só vê os próprios planos, logs, métricas e conversas.
- Faixa de assinatura validada **no backend** ao ativar novo aluno (ex.: free com 2 alunos tentando ativar o 3º → bloqueio + convite a upgrade). Nunca confiar no cliente.

---

## 6. Tratamento de erros

- **API padronizada:** todo erro no formato `{ code, message, details }` com HTTP status correto; cliente traduz `code` para PT-BR.
- **Import de Excel:** falhas (planilha corrompida, IA indisponível, JSON inválido) nunca perdem o trabalho — caem na tela de revisão com o que deu para extrair + aviso. Timeout da IA → "tentar novamente".
- **Offline no mobile:** app é **online-first** (execução acontece fora do app, então não há corrida ao vivo para gravar). O check de conclusão é uma ação leve; se falhar por falta de rede, faz retry simples. Sem fila de sync complexa.
- **Import do Strava:** atividade sem `WorkoutDay` correspondente (aluno correu num dia sem treino planejado) → guardada como atividade avulsa, não descartada. Token expirado → refresh automático; se revogado, avisar o aluno para reconectar.
- **Pagamentos:** falha no gateway não derruba a conta — período de graça + retry antes de rebaixar de tier.
- **Observabilidade:** erros com correlação (request id) via Sentry.

---

## 7. Estratégia de testes

Testes proporcionais ao risco. Pirâmide:

- **Unitários (base):** regras em `packages/core` — faixa de assinatura por nº de alunos, validação de vínculo, geração de `WorkoutDay`s, agregação de RPs/métricas. (Vitest/Jest)
- **Integração (API + banco):** rotas críticas contra Postgres de teste — auth/refresh, autorização (aluno não acessa dado de outro), ativação respeitando tier, persistência do import. (Testcontainers)
- **E2E (poucos e valiosos):**
  1. Treinador sobe planilha → revisa → plano atribuído ao aluno
  2. Aluno abre calendário, executa e registra treino
  3. Treinador atinge limite do free → bloqueio/upgrade
  4. Troca de mensagens treinador↔aluno
  - Web: Playwright · Mobile: Detox/Maestro

**Pontos dedicados:**
- **Parser de Excel:** fixtures reais (formatos variados) com JSON esperado. Testar o **contrato** (Zod valida sempre) e medir taxa de acerto, não igualdade exata.
- **Autorização:** testes negativos explícitos ("aluno A não vê plano do aluno B").
- **Sync offline:** simular perda de conexão e reconciliação da fila.

**CI:** unit + integração em cada PR; E2E no merge para a branch principal. Cobertura mirando `core` e rotas de auth/pagamento primeiro.

---

## 8. Requisitos / decisões pendentes (fora do MVP)

- "Sign in with Apple" no build iOS antes de publicar.
- Conta única não suporta treinador que também treina como aluno (exigiria segunda conta).
- Gateway de pagamento definitivo (Stripe vs. Pagar.me) a decidir na implementação.

---

## Glossário rápido de entidades

| Entidade | Papel |
|---|---|
| User | Pessoa (aluno ou treinador) |
| CoachStudent | Vínculo treinador↔aluno |
| Plan / PlanAssignment | Plano de treino e sua atribuição a um aluno |
| WorkoutDay / Block / BlockItem | Estrutura hierárquica de um dia de treino |
| Exercise | Biblioteca de exercícios |
| WorkoutLog | Confirmação de execução (check manual ou import Strava) |
| StravaConnection | Vínculo OAuth do aluno com o Strava |
| BodyMetric / PersonalRecord | Progresso corporal e melhores tempos |
| Goal | Prova alvo / meta |
| Message | Chat treinador↔aluno |
| Subscription | Assinatura do treinador por faixa de alunos |
