# Bug: Registro de conta falhando no frontend em produção

## Contexto

- **Frontend:** Next.js 15 standalone, deployado no Railway
- **URL frontend:** `https://federacaoimperium.up.railway.app`
- **Backend:** Django 5 + DRF, deployado no Railway
- **URL backend:** `https://federa-o-fnc-production.up.railway.app`
- **Auth:** DRF TokenAuthentication — `Authorization: Token ${token}`

## Sintoma

Ao tentar criar conta em `/register`, o frontend exibe:

```
Erro ao criar conta. Tente novamente.
```

Console do browser mostra:

```
Failed to load resource: the server responded with a status of 404 ()
AxiosError: Request failed with status code 404
    at eU (805-caa3318ed5798651.js:1:41538)
    at XMLHttpRequest.g (805-caa3318ed5798651.js:1:45932)
    at tt.request (805-caa3318ed5798651.js:1:54487)
    at async r.post (9218-33c505dfcf0eb8ea.js:1:763)
    at async T (page-3812bfc524ec2a8b.js:1:1404)
```

## O que já foi feito (e funcionou parcialmente)

### 1. Email travando o registro (RESOLVIDO)
O envio de email era síncrono na view. Causava timeout na requisição.

**Solução:** Criada task Celery assíncrona em `backend/fnc_notifications/tasks.py`.
`backend/users/services.py` agora usa `send_email_task.delay(...)` em vez de chamar `EmailService` diretamente.

### 2. CORS bloqueando (RESOLVIDO)
Backend não aceitava requests do domínio do frontend.

**Solução:** Adicionadas variáveis no Railway (serviço BACK):
```
CORS_ALLOWED_ORIGINS=https://federacaoimperium.up.railway.app
CSRF_TRUSTED_ORIGINS=https://federacaoimperium.up.railway.app
```

CORS confirmado funcionando:
```
access-control-allow-origin: https://federacaoimperium.up.railway.app
```

### 3. NEXT_PUBLIC_API_URL ausente (RESOLVIDO parcialmente)
Variável não estava configurada no serviço FRONT do Railway.

**Solução:** Adicionada variável no Railway (serviço FRONT):
```
NEXT_PUBLIC_API_URL=https://federa-o-fnc-production.up.railway.app
```

## Problema atual (EM ABERTO)

O frontend ainda retorna 404 ao tentar criar conta. Suspeita: o build do Next.js não está pegando a `NEXT_PUBLIC_API_URL` corretamente.

**`NEXT_PUBLIC_*` é uma variável de build-time no Next.js.** Ela é embutida no bundle JS durante o `npm run build`. Se a variável não estiver disponível no momento do build, o valor será `undefined` e o `api-client.ts` usará o fallback `http://localhost:8000`.

## Próximo passo a investigar

1. **Verificar qual URL o frontend está chamando:**
   - Abrir DevTools (F12) → aba Network
   - Tentar criar conta
   - Clicar no request 404 vermelho
   - Ver a **Request URL** — provavelmente está chamando `http://localhost:8000` ou a URL errada

2. **Verificar se a variável está no build:**
   - No Railway, serviço FRONT → Variables → confirmar `NEXT_PUBLIC_API_URL`
   - Forçar redeploy: FRONT → Deployments → 3 pontinhos → Redeploy
   - Aguardar build completo (~76s)

3. **Se ainda não funcionar — solução alternativa:**
   O `next.config.js` já tem rewrites configurados:
   ```js
   async rewrites() {
     return [
       {
         source: '/api/:path*',
         destination: `${apiUrl}/:path*`,
       },
     ];
   }
   ```
   Mas em modo `standalone` os rewrites podem não funcionar como esperado.
   Pode ser necessário remover os rewrites e fazer o frontend chamar o backend diretamente via `NEXT_PUBLIC_API_URL`.

## Arquivos relevantes

```
frontend/lib/api-client.ts          — Cliente Axios, usa NEXT_PUBLIC_API_URL como baseURL
frontend/lib/api.ts                 — authAPI.register() chama POST /api/v1/users/
frontend/app/register/page.tsx      — Página de registro, chama authAPI.register()
frontend/next.config.js             — output: standalone, rewrites configurados
backend/users/views.py:85           — UserViewSet.create() — endpoint de registro
backend/users/services.py           — VerificationService, agora usa Celery
backend/fnc_notifications/tasks.py  — send_email_task (nova, Celery async)
```

## Variáveis de ambiente necessárias

### Serviço BACK (Railway)
```
DJANGO_SETTINGS_MODULE=config.settings.production
DATABASE_URL=<Railway Postgres>
REDIS_URL=<Railway Redis>
SECRET_KEY=<gerado>
ALLOWED_HOSTS=.railway.app
CORS_ALLOWED_ORIGINS=https://federacaoimperium.up.railway.app
CSRF_TRUSTED_ORIGINS=https://federacaoimperium.up.railway.app
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=a6fb2f001@smtp-brevo.com
EMAIL_HOST_PASSWORD=<chave Brevo>
DEFAULT_FROM_EMAIL=IMPERIUM <federacaoimperium@gmail.com>
```

### Serviço FRONT (Railway)
```
NEXT_PUBLIC_API_URL=https://federa-o-fnc-production.up.railway.app
PORT=3000
```

### Serviços CELERY WORKER e CELERY BEAT (Railway)
```
DJANGO_SETTINGS_MODULE=config.settings.production
DATABASE_URL=<mesma do BACK>
REDIS_URL=<mesma do BACK>
SECRET_KEY=<mesma do BACK>
ALLOWED_HOSTS=.railway.app
```
