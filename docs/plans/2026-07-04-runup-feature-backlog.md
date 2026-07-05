# RunUp — Levantamento de Features (Gap Analysis & Backlog)

**Data:** 2026-07-04
**Base:** [design](./2026-07-04-runup-design.md) · [plano de implementação](./2026-07-04-runup-implementation-plan.md)
**Status:** Corte de fases validado

Legenda: ✅ já planejado · 🟡 parcial (modelo suporta, precisa estender) · 🆕 novo

---

## Fases

- **MVP1** — entra no plano de implementação atual (M0–M5)
- **MVP1.5** — logo após o MVP1, antes de abrir para mais usuários
- **MVP2** — segunda onda (integrações pesadas, IA avançada, conteúdo)

---

## 1. Treinos

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Treinos estruturados em blocos visuais (Aquecimento→Tiros→Desaquecimento) | 🟡 | MVP1 | `Block.role` (`warmup`/`main`/`cooldown`) + estrutura de **repetição** no `BlockItem` de corrida (ex.: 10×400m c/ 90s trote) |
| Biblioteca de treinos (Tiro, Intervalado, Longão, Regenerativo, Tempo Run…) | 🆕 | MVP1 | Entidade **`WorkoutTemplate`** — treino reusável do treinador ou do sistema, com `category` |
| Duplicar treino | 🆕 | MVP1 | Ação de cópia sobre `WorkoutDay`/template |
| Modelos de treino do treinador | 🆕 | MVP1 | Coberto por `WorkoutTemplate` (owner = coach) |
| Histórico de treinos realizados | ✅ | MVP1 | `WorkoutLog` |
| Aquecimento e desaquecimento | 🟡 | MVP1 | `Block.role` |
| Anotações do atleta | ✅ | MVP1 | `WorkoutLog.notes` |
| Marcar concluído / **parcial** / perdido | 🟡 | MVP1 | Adicionar status `partial` a `WorkoutDay`/`WorkoutLog` |
| Treinos recorrentes | 🆕 | MVP1.5 | Regra de recorrência ao aplicar template |
| Upload de fotos do treino | 🆕 | MVP1.5 | Storage de mídia (S3) + anexos no `WorkoutLog` |
| Aplicação de treinos em massa (vários atletas) | 🆕 | MVP1.5 | Aplicar `WorkoutTemplate`/`Plan` a N alunos |

## 2. Planejamento

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Ciclos de treinamento (8/12/16 semanas) | ✅ | MVP1 | `Plan` (duração) |
| Objetivo principal (5/10/21/42 km ou prova) | ✅ | MVP1 | `Goal` |
| Contagem regressiva para provas | 🟡 | MVP1 | Countdown na página da meta (`Goal.raceDate`) |

## 3. Comunicação treinador × atleta

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Chat | ✅ | MVP1 | `Message` |
| Comentários em cada treino | 🆕 | MVP1 | Entidade **`WorkoutComment`** (thread por `WorkoutDay`/`WorkoutLog`) |
| Reações rápidas (👍🔥👏) | 🆕 | MVP1.5 | Reaction em comment/log |
| Solicitação de alteração de treino | 🆕 | MVP1.5 | Tipo especial de `WorkoutComment` |
| Notificação quando treinador altera treino | 🆕 | MVP1.5 | Infra de notificações |
| Feedback por áudio | 🆕 | MVP2 | Gravação + storage de áudio |

## 4. Monitoramento

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Esforço percebido (RPE 1–10) | ✅ | MVP1 | `WorkoutLog.perceivedEffort` |
| Dor muscular | ✅ | MVP1 | `WorkoutLog.pain` |
| Peso corporal | ✅ | MVP1 | `BodyMetric` |
| FC, cadência, pace médio | 🟡 | MVP1 | Estender `WorkoutLog` com métricas (vêm do Strava/M3.5) |
| Pace por km (splits) | 🟡 | MVP1 | Array de splits no `WorkoutLog` |
| Humor antes/depois, fadiga, sono | 🆕 | MVP1.5 | Entidade **`WellnessLog`** (check-in diário) |

## 5. Estatísticas (dashboard)

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Km semanal / mensal, tempo total | 🆕 | MVP1 | Agregações sobre `WorkoutLog` |
| Evolução de pace / FC | 🆕 | MVP1 | Séries temporais sobre `WorkoutLog` |
| Volume por tipo de treino | 🆕 | MVP1 | Agrupamento por categoria do treino |
| Recordes pessoais | ✅ | MVP1 | `PersonalRecord` |
| Streak | ✅ | MVP1 | Pílula de dias seguidos (M5) |

## 6. Objetivos

| Feature | Status | Fase | Resolução |
|---|---|---|---|
| Objetivo de provas | ✅ | MVP1 | `Goal` |
| Meta semanal / mensal / anual de km | 🟡 | MVP1.5 | Entidade **`GoalTarget`** (métrica + período + alvo) |
| Objetivo de pace / FC | 🟡 | MVP1.5 | `GoalTarget` |

## 7. Inteligência Artificial

| Feature | Fase | Nota |
|---|---|---|
| Estimar tempo de prova | MVP1 | ✅ já planejado (M3.6, Riegel/VDOT) |
| Explicar cada treino | MVP1 | Prompt sobre o `WorkoutDay` estruturado |
| Resumir evolução semanal | MVP1 | Prompt sobre agregados da semana |
| Criar planos personalizados | MVP2 | |
| Ajustar treino conforme feedback | MVP2 | |
| Sugerir pace | MVP2 | |
| Detectar excesso de treino / recomendar recuperação | MVP2 | Depende de `WellnessLog` + histórico |
| Responder dúvidas sobre corrida | MVP2 | |

## 8. Integrações

| Feature | Fase | Nota |
|---|---|---|
| Strava (import: atividade, GPS, pace, distância, FC, altimetria) | MVP1 | ✅ M3.5 |
| Garmin / Coros (import + **push de treino para o relógio**) | MVP2 | Garmin primeiro (Training API); Strava **não** aceita push de treino |
| Polar / Suunto | MVP2 | |
| Apple Watch (HealthKit) / Samsung Health / Google Fit | MVP2 | HealthKit exige código nativo |

## 9. Notificações

| Feature | Fase |
|---|---|
| Aviso de treino alterado | MVP1.5 |
| Lembrete do treino do dia | MVP1.5 |
| Lembrete de muitos dias sem correr (atleta) | MVP1.5 (o alerta ao **treinador** já é MVP1/M5) |
| Resumo semanal | MVP1.5 |
| Lembrete de hidratação | MVP2 |

## 10. Conteúdo educativo

| Feature | Fase |
|---|---|
| Biblioteca de exercícios educativos, alongamentos, fortalecimento | MVP2 |
| Vídeos demonstrativos | MVP2 |
| Dicas de nutrição, estratégias de prova, glossário | MVP2 |

## 11. Saúde

| Feature | Fase | Nota |
|---|---|---|
| Controle de dores por treino | MVP1 | ✅ `WorkoutLog.pain` |
| Registro de lesões, histórico de recuperação, fisioterapia, escala de dor, medicamentos | MVP2 | Entidade `Injury` + registros associados |

## 12. Para o treinador

| Feature | Fase | Nota |
|---|---|---|
| Dashboard com todos os atletas | MVP1 | ✅ M2 |
| Alertas de atletas sem treinar | MVP1 | ✅ monitor de aderência (M5) |
| Criação de modelos de treino | MVP1 | `WorkoutTemplate` |
| Aplicação de treinos em massa | MVP1.5 | |
| Alertas de fadiga elevada | MVP1.5 | Depende de `WellnessLog` |
| Comparativo de evolução dos atletas | MVP2 | |
| Agenda de avaliações | MVP2 | |
| Exportação de relatórios | MVP2 | |

---

## Novas entidades introduzidas por este levantamento

| Entidade | Fase | Papel |
|---|---|---|
| `WorkoutTemplate` | MVP1 | Treino reusável (do sistema ou do treinador), com categoria (Tiro, Longão…) |
| `WorkoutComment` | MVP1 | Thread de comentários por treino (base p/ reações e solicitações) |
| `WellnessLog` | MVP1.5 | Check-in diário: humor, fadiga, sono |
| `GoalTarget` | MVP1.5 | Metas por métrica/período (km semanal, pace alvo…) |
| `Injury` | MVP2 | Registro de lesões e recuperação |

## Extensões de entidades existentes (MVP1)

- `Block.role` — `warmup` | `main` | `cooldown`
- `BlockItem` (running) — estrutura de **repetição/intervalo** (reps × distância/tempo + recuperação)
- `WorkoutDay`/`WorkoutLog` — status `partial` (além de done/skipped)
- `WorkoutLog` — métricas: FC média/máx, cadência, pace médio, **splits por km**, altimetria
