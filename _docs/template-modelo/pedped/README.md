sales-system/
├── app/                      # 🎨 Frontend (Nova estrutura do Nuxt 4)
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   └── utils/                # Utils APENAS do frontend (ex: formatadores de data)
│
├── server/                   # ⚙️ Backend (Gerenciado pelo Nitro)
│   ├── api/                  # Seus endpoints (ex: s3-upload.post.ts, send-mail.post.ts)
│   ├── middleware/           # Interceptadores do servidor (ex: checagem de sessão/token)
│   ├── plugins/              # Inicializadores (ex: conectar em um banco se necessário no boot)
│   └── utils/                # 🛠️ SEUS SERVIÇOS ENTRAM AQUI
│       ├── s3.ts             # Instância e funções do S3 (MinIO, AWS, R2, etc.)
│       └── smtp.ts           # Instância e funções do Nodemailer ou similar
│
├── public/                   # Arquivos estáticos (favicon, imagens públicas)
├── .env                      # Variáveis de ambiente secretas
└── nuxt.config.ts            # Configuração principal

---

### 📋 Lista Completa de Todas as Extensões PostgreSQL Necessárias:

| # | Extensão | Schema Recomendado | Para que serve na Aplicação |
|---|---|---|---|
| 1 | **`vault`** | `vault` | **Cofre de segredos e credenciais** criptografadas em repouso (Chave OpenAI e Token WhatsApp Provedor). |
| 2 | **`pg_cron`** | `pg_catalog` | **Agendamento e execução de tarefas em background** (drain automático de outbox de webhooks e arquivamento de pedidos). |
| 3 | **`pg_net`** | `extensions` | **Requisições HTTP/HTTPS assíncronas** originadas dentro do próprio banco (usado pelos crons para invocar a API Nitro). |
| 4 | **`pgcrypto`** | `extensions` | **Criptografia e funções de hash** (usado por UUIDs, hashes de segurança e tokens). |
| 5 | **`uuid-ossp`** | `extensions` | **Gerador de UUIDs** nativo do Postgres (`gen_random_uuid()`). |
| 6 | **`pg_trgm`** | `extensions` | **Busca inteligente (fuzzy) de produtos** por similaridade e trigramas (ex: busca com pequenos erros de digitação). |
| 7 | **`unaccent`** | `extensions` | **Normalização de acentos** na busca de produtos (ex: encontrar *"pão"* digitando *"pao"*). |

---

### 🛠️ Comando SQL Único para Ativar Todas Manualmente (se necessário):

```sql
CREATE EXTENSION IF NOT EXISTS vault        WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS pg_cron      WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net       WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm      WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent     WITH SCHEMA extensions;
```