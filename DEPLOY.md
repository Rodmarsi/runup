# Deploy do RunUp

## Opção atual (em produção): Render (free) + Neon (Postgres free) + GHCR

Sem custo, sem VPS. Ao vivo em:
- Web: https://runup-web.onrender.com
- API: https://runup-api.onrender.com
- Banco: Postgres no Neon

**Por que via registry, e não build direto no Render:** tanto `pnpm install`
do monorepo (mesmo filtrado — o pnpm precisa validar o lockfile do workspace
inteiro, 1000+ entradas) quanto o `next build` sozinhos já passam de 512MB de
RAM, o limite do build no plano free. Confirmado reproduzindo localmente com
`docker build --memory=512m`. Por isso as imagens são **buildadas localmente
(sem limite de memória) e publicadas prontas no GitHub Container Registry**;
o Render só faz `docker pull` + roda, sem build nenhum do lado dele. Cada
serviço no Render foi criado com "Deploy an existing image from a registry"
(não "conectar repositório Git").

Imagens: `ghcr.io/rodmarsi/runup-api:latest` e `ghcr.io/rodmarsi/runup-web:latest` (públicas).

### Como atualizar depois de mudar código

**API** (muda algo em `packages/api`, `packages/core`, `packages/db` ou `packages/types`):
```bash
pnpm --filter @runup/api run predeploy   # gera dist/server.mjs + deploy/package.json
git add packages/api/dist packages/api/deploy
git commit -m "chore(api): update deploy bundle"
git push

docker build -f packages/api/Dockerfile -t ghcr.io/rodmarsi/runup-api:latest .
docker push ghcr.io/rodmarsi/runup-api:latest
```

**Web** (muda algo em `apps/web` ou nos pacotes que ela usa):
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://runup-api.onrender.com \
  -f apps/web/Dockerfile -t ghcr.io/rodmarsi/runup-web:latest .
docker push ghcr.io/rodmarsi/runup-web:latest
```

Depois do push da imagem, no Render: abra o serviço → **Manual Deploy** →
**Deploy latest image** (ele não redetecta sozinho uma imagem nova com a
mesma tag `latest`).

### Limitações do plano free (ok para validar com poucos usuários; migrar pra
VPS quando tiver alunos pagantes de verdade)
- Cada serviço "dorme" após 15min sem uso — primeiro acesso depois disso
  demora ~30-50s (cold start).
- Banco Neon: 100h de computação/mês, 0.5GB por branch.

---

## Alternativa: VPS + Docker Compose + Caddy

Roda **Postgres + API + Web + Caddy** (HTTPS automático) numa VPS, via Docker Compose.
Vale a pena migrar pra cá quando o app tiver alunos pagantes de verdade (sem
cold start de ~1min do plano free do Render). O app mobile (Expo) é
distribuído à parte (EAS Build → APK/lojas) em ambos os casos.

## Pré-requisitos

- Uma VPS Linux (ex.: Hetzner, DigitalOcean) com Docker + Docker Compose.
- Um domínio com dois subdomínios apontando (registro **A**) para o IP da VPS:
  - `api.seudominio.com`
  - `app.seudominio.com`

## 1. Preparar a VPS

```bash
ssh root@IP_DA_VPS
# Docker + Compose (script oficial)
curl -fsSL https://get.docker.com | sh
```

## 2. Trazer o código

Opção A — GitHub:
```bash
git clone https://github.com/SEU_USUARIO/runup.git
cd runup
```
Opção B — sem GitHub (do seu PC): `rsync -av --exclude node_modules --exclude .next ./ root@IP:/root/runup/`

## 3. Configurar os segredos

```bash
cp .env.prod.example .env
nano .env    # preencha senha do Postgres, JWT_SECRET, domínios e as chaves das integrações
```
Gere o `JWT_SECRET`: `openssl rand -base64 48`.

## 4. Subir tudo

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- O Caddy obtém os certificados HTTPS automaticamente (pode levar ~1 min na 1ª vez).
- A API roda as migrations do Prisma sozinha no start (`migrate deploy`).

Verifique:
```bash
curl https://api.seudominio.com/health        # {"status":"ok",...}
docker compose -f docker-compose.prod.yml ps  # todos "Up"
```
Abra `https://app.seudominio.com` no navegador → tela de login.

## 5. Atualizar os redirects OAuth (produção)

- **Strava** (strava.com/settings/api): "Authorization Callback Domain" → `api.seudominio.com`.
- **Google** (console.cloud.google.com → Credenciais): adicione o URI de redirecionamento
  `https://api.seudominio.com/auth/google/callback`.

## Atualizar depois de mudanças

```bash
cd runup && git pull        # (ou rsync de novo)
docker compose -f docker-compose.prod.yml up -d --build
```

## Backup do banco (recomendado — cron diário)

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U runup runup | gzip > backup-$(date +%F).sql.gz
```

## App mobile (APK)

Depois que a API estiver no ar, gere o APK apontando para ela:
```bash
npm i -g eas-cli && eas login
cd apps/mobile
# EXPO_PUBLIC_API_URL=https://api.seudominio.com no eas.json (profile) ou ambiente
eas build -p android --profile preview   # link do APK ao final
```
