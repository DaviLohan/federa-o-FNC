# IMPERIUM — Stack Tecnológica

> Plataforma de e-Sports para EA SPORTS FC Pro Clubs

---

## Linguagens

| Linguagem | Onde é usada | Versão |
|---|---|---|
| **Python** | Backend (Django) | 3.11 |
| **TypeScript** | Frontend (Next.js) | ^5 |
| **JavaScript** | Configs do frontend (`next.config.js`, `postcss.config.js`) | ES2017 |
| **SQL** | Banco de dados (PostgreSQL / SQLite) | — |
| **YAML** | Docker Compose | — |
| **Bash/Shell** | Scripts de cron (`cron/detect_wo.sh`), Dockerfiles | — |
| **CSS** | Tailwind + CSS custom properties (`globals.css`) | — |
| **HTML** | Templates de email Django (`templates/emails/`) | — |

---

## Backend — Frameworks e Bibliotecas

| Biblioteca | Versão | Finalidade |
|---|---|---|
| **Django** | >=5.0,<5.1 | Framework web principal |
| **Django REST Framework** | >=3.14.0 | Camada de API REST |
| **django-allauth** | >=0.57.0 | Autenticação e login social (Google OAuth) |
| **dj-rest-auth** | >=5.0.0 | Endpoints REST de autenticação (JWT) |
| **djangorestframework-simplejwt** | >=5.3.0 | Gerenciamento de tokens JWT (access/refresh) |
| **django-cors-headers** | >=4.3.0 | Configuração de CORS |
| **django-filter** | >=23.5 | Filtragem de querysets no DRF |
| **drf-spectacular** | >=0.27.0 | Geração de schema OpenAPI 3 / Swagger / ReDoc |
| **Celery** | >=5.3.4 | Fila de tarefas assíncronas |
| **redis** (cliente Python) | >=5.0.1 | Conexão com Redis (Celery + cache) |
| **django-redis** | >=5.4.0 | Backend de cache Django via Redis |
| **psycopg2-binary** | >=2.9.9 | Adaptador PostgreSQL |
| **dj-database-url** | >=2.1.0 | Parsing de `DATABASE_URL` |
| **python-decouple** | >=3.8 | Gerenciamento de variáveis de ambiente |
| **Pillow** | >=10.1.0 | Processamento de imagens (logos, avatares) |
| **PyJWT** | >=2.8.0 | Encoding/decoding de tokens JWT |
| **cryptography** | >=41.0.0 | Operações criptográficas |
| **whitenoise** | >=6.6.0 | Servir arquivos estáticos em produção |
| **gunicorn** | >=21.2.0 | Servidor WSGI de produção |
| **stripe** | >=7.8.0 | Integração Stripe (pagamentos internacionais) |
| **mercadopago** | >=2.2.1 | Integração Mercado Pago (PIX) |
| **requests** | (transitiva) | Chamadas HTTP para gateways de pagamento |

### Testes

| Biblioteca | Finalidade |
|---|---|
| **pytest** | Test runner (configurado via `pytest.ini`) |
| **pytest-cov** | Cobertura de código |
| **factory-boy** | Factories de modelos para testes |
| **Faker** | Geração de dados falsos (`pt_BR`) |

---

## Frontend — Frameworks e Bibliotecas

| Biblioteca | Versão | Finalidade |
|---|---|---|
| **Next.js** | 15.1.6 | Framework React (App Router) |
| **React** | ^19.0.0 | Biblioteca de UI |
| **React DOM** | ^19.0.0 | Renderização React no DOM |
| **TypeScript** | ^5 | Sistema de tipagem |
| **Tailwind CSS** | ^3.4.1 | CSS utilitário |
| **@tanstack/react-query** | ^5.90.20 | Gerenciamento de estado do servidor / data fetching |
| **Zustand** | ^5.0.11 | Gerenciamento de estado do cliente (auth store) |
| **Axios** | ^1.13.4 | Cliente HTTP |
| **Framer Motion** | ^12.35.2 | Animações |
| **Lucide React** | ^0.563.0 | Biblioteca de ícones |
| **Recharts** | ^3.8.1 | Gráficos e visualização de dados |
| **Autoprefixer** | ^10.0.1 | Prefixação CSS (plugin PostCSS) |
| **PostCSS** | ^8 | Pipeline de processamento CSS |
| **ESLint** | ^9 | Linting |
| **eslint-config-next** | 15.1.6 | Regras ESLint do Next.js |

### Fontes (Google Fonts)

- **Space Grotesk** — headings
- **Inter** — body text
- **JetBrains Mono** — monospace

---

## Banco de Dados e Cache

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **PostgreSQL** | 15 (Alpine) | Banco principal (produção / Docker) |
| **SQLite** | built-in | Banco de desenvolvimento (local, sem Docker) |
| **Redis** | 7 (Alpine) | Cache (`django-redis`) + broker/resultado Celery |

---

## Infraestrutura e DevOps

| Tecnologia | Detalhes | Finalidade |
|---|---|---|
| **Docker** | `python:3.11-slim` (backend), `node:20-alpine` (frontend) | Containerização |
| **Docker Compose** | `docker-compose.yml` + `docker-compose.override.yml` | Orquestração multi-container |
| **Gunicorn** | 3 workers, timeout 120s | Servidor WSGI de produção |
| **WhiteNoise** | `CompressedManifestStaticFilesStorage` | Arquivos estáticos em produção |
| **Cloudflare Tunnel** | `cloudflared` (binário no projeto) | Proxy/tunnel para expor serviços locais |
| **Cron** | `cron/detect_wo.sh` | Detecção de W.O. a cada 6 horas |
| **Gmail SMTP** | Configurado em settings | Entrega de email (dev: console backend) |

### Estratégia de ambientes

- `docker-compose.yml` — config de **produção** (Gunicorn, `config.settings.production`)
- `docker-compose.override.yml` — overrides de **desenvolvimento** (runserver, portas expostas, `config.settings.development`)

---

## APIs e Serviços Externos

| Serviço | Biblioteca/Config | Finalidade |
|---|---|---|
| **Mercado Pago** | `mercadopago` + `MercadoPagoPixGateway` | Pagamentos PIX (gateway ativo) |
| **Asaas** | `AsaasPixGateway` via `requests` | Pagamentos PIX (legado) |
| **Stripe** | `stripe` | Pagamentos internacionais |
| **Google OAuth** | `django-allauth` (`allauth.socialaccount.providers.google`) | Login social |
| **Gmail SMTP** | Django email settings | Entrega de email |

---

## Documentação da API

| Ferramenta | Endpoint | Finalidade |
|---|---|---|
| **drf-spectacular** (OpenAPI 3) | `/api/schema/` | Schema OpenAPI raw |
| **Swagger UI** | `/api/docs/` | Documentação interativa |
| **ReDoc** | `/api/redoc/` | Documentação alternativa |

---

## Apps Django (7 apps locais)

1. **users** — Modelo de usuário, perfis de jogador/dono de time, autenticação
2. **fnc_teams** — Times, membros, convites, formações
3. **fnc_championships** — Campeonatos, inscrições, classificações, grupos, chaves, premiações
4. **fnc_matches** — Partidas, súmulas, gols, assistências, cartões, contestações, detecção de W.O.
5. **player_stats** — Estatísticas de jogadores/times, resumos de temporada, rankings
6. **fnc_notifications** — Notificações in-app + email
7. **fnc_payments** — Processamento de pagamentos (Mercado Pago, Asaas, Stripe), webhooks

---

## Arquitetura — Decisões-Chave

| Aspecto | Escolha |
|---|---|
| **Autenticação** | Token-based (DRF Token + JWT via SimpleJWT/dj-rest-auth) + Google OAuth |
| **Estado (frontend)** | Zustand (cliente/auth) + TanStack React Query (servidor) |
| **Pagamentos** | Multi-gateway (Mercado Pago ativo, Asaas legado, Stripe configurado), PIX-first |
| **Tarefas assíncronas** | Celery com Redis como broker |
| **Cache** | Redis via django-redis |
| **Deploy** | Docker Compose com configs split produção/desenvolvimento |
| **API** | REST (DRF) com URLs versionadas (`/api/v1/`), documentação OpenAPI 3 |
