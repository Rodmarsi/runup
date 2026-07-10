# Deploy do RunUp (VPS + Docker + Caddy)

Roda **Postgres + API + Web + Caddy** (HTTPS automático) numa VPS, via Docker Compose.
O app mobile (Expo) é distribuído à parte (EAS Build → APK/lojas).

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
