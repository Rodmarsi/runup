# RunUp

App de treinos guiados de fitness (corrida + força + mobilidade) com marketplace treinador↔aluno.

- **Design & planos:** [`docs/plans`](docs/plans) · **Design system:** [`docs/design/design-system.md`](docs/design/design-system.md)

## Stack

Monorepo TypeScript (pnpm + Turborepo).

| Workspace | O quê |
|---|---|
| `apps/mobile` | App React Native (Expo) — aluno + treinador |
| `apps/web` | Dashboard Next.js — treinador |
| `packages/types` | Tipos compartilhados (fonte da verdade do modelo) |
| `packages/core` | Regras de negócio (assinatura, preditor Riegel) |
| `packages/db` | Schema Prisma + Postgres |
| `packages/api` | Backend Fastify |
| `packages/ui` | Tokens do design system |

## Requisitos

- Node ≥ 20
- pnpm (`npm i -g pnpm`)
- Docker (para o Postgres local)

## Começando

```bash
pnpm install                 # instala tudo
docker compose up -d         # sobe o Postgres
cp packages/db/.env.example packages/db/.env
pnpm db:generate             # gera o Prisma Client
pnpm db:migrate              # cria as tabelas

pnpm dev                     # sobe api + web + mobile
```

## Scripts

```bash
pnpm dev          # tudo em paralelo (Turborepo)
pnpm typecheck    # tsc --noEmit em todos os packages
pnpm test         # testes (Vitest)
pnpm build        # build de produção
```

A API expõe `GET /health` em `http://localhost:3333/health`.
