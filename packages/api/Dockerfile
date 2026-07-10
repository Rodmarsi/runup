# Imagem da API RunUp.
#
# Não usamos `pnpm install` do monorepo aqui: mesmo filtrado, o pnpm precisa
# validar o lockfile inteiro do workspace (1000+ entradas) e isso sozinho já
# passa de 512MB de RAM — inviável em planos free (ex.: Render). Em vez disso,
# o bundle (esbuild) e o manifesto de dependências de runtime são gerados
# ANTES do build, localmente, via `pnpm --filter @runup/api run predeploy`
# (veja packages/api/scripts/prepare-deploy.mjs). A imagem só faz um `npm
# install` pequeno e independente do workspace.
FROM node:22-slim

# openssl é exigido pelo Prisma em runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY packages/api/deploy/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY packages/db/prisma ./prisma
RUN npx prisma generate

COPY packages/api/dist/server.mjs ./server.mjs

ENV NODE_ENV=production
EXPOSE 3333

# Aplica as migrations e sobe o servidor já compilado.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.mjs"]
