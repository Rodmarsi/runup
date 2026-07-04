# RunUp — Documento de Design

**Data:** 2026-07-04
**Status:** Design validado, pronto para planejamento de implementação

---

## 1. Visão do produto

**RunUp** é um app de **treinos guiados de fitness** (corrida + força + mobilidade) com um marketplace de dois lados:

- **Aluno** — executa treinos, acompanha progresso e pode usar planos prontos ou ser acompanhado por um treinador.
- **Treinador** — planeja treinos para seus alunos, direto no app ou subindo uma planilha Excel que ele já usa.

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
- **WorkoutLog** — o que o aluno de fato fez (distância real, ritmo, notas, RPE). Separado do prescrito, para comparar planejado × realizado.
- **BodyMetric** — histórico corporal (peso, %gordura, medidas, data). Série temporal para gráficos.
- **PersonalRecord (PR)** — melhores tempos por distância (5k, 10k, 21k, 42k): `distance`, `time`, `achievedAt`.

### Metas
- **Goal** — definida em conjunto por aluno e treinador: `targetRace` (5k/10k/21k/42k/outro), `raceDate`, `targetTime`, status. Vincula-se ao aluno e opcionalmente a um `Plan`. É o "norte" do planejamento.

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
- **Oportunidade Strava (fase seguinte):** importar automaticamente corridas e RPs via API do Strava, alimentando `WorkoutLog` e `PersonalRecord` sem digitação.
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
- **Offline no mobile:** `WorkoutLog` salvo localmente e sincronizado depois (fila de sync). Conflitos: última escrita vence no log do aluno.
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

- Integração de importação automática via Strava (corridas + RPs).
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
| WorkoutLog | Execução real do aluno |
| BodyMetric / PersonalRecord | Progresso corporal e melhores tempos |
| Goal | Prova alvo / meta |
| Message | Chat treinador↔aluno |
| Subscription | Assinatura do treinador por faixa de alunos |
