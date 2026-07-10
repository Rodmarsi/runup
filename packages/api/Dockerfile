# Imagem da API RunUp. Contexto de build = raiz do monorepo.
FROM node:22-slim

# openssl é exigido pelo Prisma em runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# Copia o monorepo (o .dockerignore exclui node_modules/.next/etc.).
COPY . .

# Instala só a API e suas dependências de workspace (core, db, types).
RUN pnpm install --frozen-lockfile --filter "@runup/api..."

# Gera o Prisma Client.
RUN pnpm --filter @runup/db exec prisma generate

ENV NODE_ENV=production
EXPOSE 3333

# Aplica as migrations e sobe o servidor (tsx roda o TS dos pacotes do workspace).
CMD ["sh", "-c", "pnpm --filter @runup/db exec prisma migrate deploy && pnpm --filter @runup/api exec tsx src/server.ts"]
