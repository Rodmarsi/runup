# Deploy do RunUp

## Opção atual (em produção): VPS (Hostinger KVM2) + Docker Compose + Caddy

Migrado do Render em 2026-07-14. Ao vivo em:
- Web: https://app.apprunup.com
- API: https://api.apprunup.com
- Banco: Postgres self-hosted no próprio VPS (era Neon antes da migração)
- Servidor: `179.197.73.113` (Hostinger KVM2, Ubuntu 24.04, 2 vCPU / 8GB RAM / 100GB disco)
- Acesso: `ssh -i ~/.ssh/runup_vps root@179.197.73.113` (chave dedicada, não a do GitHub)

Sem cold start (ao contrário do plano free do Render) e sem limites de uso do
Neon free. Backup diário automático do Postgres via cron (`/root/backup-db.sh`,
6h UTC, retenção de 14 dias em `/root/backups`).

As imagens continuam sendo **buildadas localmente e publicadas no GHCR**
(mesmo pipeline de antes) — o VPS só faz `docker compose pull` + `up -d`,
sem build nenhum do lado dele. Ver seção "VPS + Docker Compose + Caddy"
abaixo para o passo a passo completo (setup inicial e como atualizar depois
de mudanças de código).

Imagens: `ghcr.io/rodmarsi/runup-api:latest` e `ghcr.io/rodmarsi/runup-web:latest` (públicas).

---

## Opção anterior (histórico): Render (free) + Neon (Postgres free) + GHCR

Usada até 2026-07-14, quando o app passou a ter alunos pagantes de verdade e
o cold start de ~1min do plano free deixou de fazer sentido. Mantido aqui só
como referência caso seja necessário reverter ou rodar um ambiente de
staging separado.

**Por que via registry, e não build direto no Render:** tanto `pnpm install`
do monorepo (mesmo filtrado — o pnpm precisa validar o lockfile do workspace
inteiro, 1000+ entradas) quanto o `next build` sozinhos já passam de 512MB de
RAM, o limite do build no plano free. Confirmado reproduzindo localmente com
`docker build --memory=512m`. Por isso as imagens eram buildadas localmente
e publicadas prontas no GitHub Container Registry; o Render só fazia
`docker pull` + rodava, sem build nenhum do lado dele. Cada serviço no
Render foi criado com "Deploy an existing image from a registry" (não
"conectar repositório Git").

### Como atualizar (se algum dia voltar a usar o Render)

**API**:
```bash
pnpm --filter @runup/api run predeploy   # gera dist/server.mjs + deploy/package.json
git add packages/api/dist packages/api/deploy
git commit -m "chore(api): update deploy bundle"
git push

docker build -f packages/api/Dockerfile -t ghcr.io/rodmarsi/runup-api:latest .
docker push ghcr.io/rodmarsi/runup-api:latest
```

**Web**:
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://runup-api.onrender.com \
  -f apps/web/Dockerfile -t ghcr.io/rodmarsi/runup-web:latest .
docker push ghcr.io/rodmarsi/runup-web:latest
```

Depois do push da imagem, no Render: abra o serviço → **Manual Deploy** →
**Deploy latest image** (ele não redetecta sozinho uma imagem nova com a
mesma tag `latest`).

### Limitações do plano free que motivaram a migração
- Cada serviço "dorme" após 15min sem uso — primeiro acesso depois disso
  demora ~30-50s (cold start).
- Banco Neon: 100h de computação/mês, 0.5GB por branch.

---

## VPS + Docker Compose + Caddy (setup completo)

Roda **Postgres + API + Web + Caddy** (HTTPS automático) numa VPS, via Docker Compose.
Vale a pena migrar pra cá quando o app tiver alunos pagantes de verdade (sem
cold start de ~1min do plano free do Render). O app mobile (Expo) é
distribuído à parte (EAS Build → APK/lojas) em ambos os casos.

As imagens **não são buildadas no VPS** — continuam sendo buildadas localmente
(sem limite de memória) e publicadas no GHCR, exatamente como no fluxo do
Render. O VPS só precisa de três arquivos (`docker-compose.prod.yml`,
`Caddyfile`, `.env`) e faz `docker compose pull` + `up -d`.

## Pré-requisitos

- VPS Linux com Docker + Docker Compose (já vem pronto em templates como o da
  Hostinger; senão: `curl -fsSL https://get.docker.com | sh`).
- Um domínio com dois subdomínios apontando (registro **A**) para o IP da VPS:
  - `api.seudominio.com`
  - `app.seudominio.com`

## 1. Copiar os arquivos de config para o VPS

Do seu PC (não precisa clonar o repo inteiro no servidor):
```bash
scp docker-compose.prod.yml Caddyfile .env.prod.example root@IP_DA_VPS:/root/runup/
```

## 2. Configurar os segredos

No VPS:
```bash
cd /root/runup
cp .env.prod.example .env
nano .env    # preencha senha do Postgres, JWT_SECRET, domínios e as chaves das integrações
```
Gere o `JWT_SECRET`: `openssl rand -base64 48`.
Gere o `INTERNAL_CRON_SECRET`: `openssl rand -base64 32` (mesmo valor vai no secret `REMINDER_CRON_SECRET` do GitHub Actions).

## 3. Subir tudo

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
- O Caddy obtém os certificados HTTPS automaticamente (pode levar ~1 min na 1ª vez).
- A API roda as migrations do Prisma sozinha no start (`migrate deploy`).

Verifique:
```bash
curl https://api.seudominio.com/health        # {"status":"ok",...}
docker compose -f docker-compose.prod.yml ps  # todos "Up"
```
Abra `https://app.seudominio.com` no navegador → tela de login.

## 4. Atualizar os redirects OAuth (produção)

- **Strava** (strava.com/settings/api): "Authorization Callback Domain" → `api.seudominio.com`.
- **Google** (console.cloud.google.com → Credenciais): adicione o URI de redirecionamento
  `https://api.seudominio.com/auth/google/callback`.

## 5. Atualizar o cron de lembretes

Em `.github/workflows/reminders.yml`, troque a URL do Render pela do VPS
(`https://api.seudominio.com/internal/reminders/run`).

## Atualizar depois de mudanças de código

No PC (mesmo fluxo de sempre, só troca o alvo final):
```bash
docker build -f packages/api/Dockerfile -t ghcr.io/rodmarsi/runup-api:latest . && docker push ghcr.io/rodmarsi/runup-api:latest
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.seudominio.com -f apps/web/Dockerfile -t ghcr.io/rodmarsi/runup-web:latest . && docker push ghcr.io/rodmarsi/runup-web:latest
```
No VPS:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
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
