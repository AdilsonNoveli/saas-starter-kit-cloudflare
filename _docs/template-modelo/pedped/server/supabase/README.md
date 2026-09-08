# Supabase Database Scripts

Este diretório contém os scripts SQL para inicializar e popular o banco de dados do projeto.

---

## 📁 Arquivos

### 1. `supabase-init.sql`
Script principal de inicialização do banco de dados.

**Contém:**
- Extensões (PostGIS)
- Enums (tipos customizados)
- Tabelas (13 tabelas principais)
- Triggers (3 triggers automáticos)
- Funções (5 funções customizadas)
- Row Level Security (RLS)
- Políticas de acesso
- Bootstrap inicial (loja padrão)

**Como executar:**
```bash
# Via Supabase CLI
supabase db reset

# Ou via SQL Editor no Dashboard
# Cole o conteúdo do arquivo e execute
```

---

### 2. `seed-auth-user.sql`
Seed para criar usuário administrador de teste.

**Credenciais criadas:**
- 📧 **Email:** `admin@pedped.com`
- 🔑 **Senha:** `Admin@123456`
- 👤 **Role:** `admin`
- 🆔 **UUID:** `00000000-0000-0000-0000-000000000001`

**Como executar:**
```bash
# Via Supabase SQL Editor
# Cole o conteúdo e execute

# Ou via migration (já aplicado)
```

**⚠️ IMPORTANTE:**
- Este usuário é **apenas para desenvolvimento/testes**
- **REMOVER ou ALTERAR** as credenciais em produção
- A senha está hasheada com bcrypt no banco

**Como alterar a senha:**
```sql
-- Atualizar senha do usuário
UPDATE auth.users
SET encrypted_password = crypt('NovaSenha@123', gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@pedped.com';
```

---

### 3. `SECURITY_ADVISORS.md`
Documentação completa sobre os avisos de segurança do Supabase Linter.

**Contém:**
- Status de todos os avisos
- Explicações técnicas
- Mitigações implementadas
- Score de segurança (100% código customizado)

---

## 🔐 Segurança

### RLS (Row Level Security)

Todas as tabelas da aplicação têm RLS habilitado:

✅ **Tabelas com RLS:**
- `loja`
- `categorias`
- `produtos`
- `kits`
- `kit_itens`
- `promocoes`
- `promocao_produtos`
- `clientes`
- `enderecos_cliente`
- `sessoes`
- `pedidos`
- `itens_pedido`

### Políticas de Acesso

**Público (anônimo):**
- Leitura de loja, categorias, produtos disponíveis
- Leitura de sessões ativas

**Autenticado (admin):**
- Acesso completo a todas as tabelas
- Validação via `auth.uid() IS NOT NULL`

---

## 🚀 Setup Rápido

### 1. Inicializar banco de dados
```bash
# Executar script principal
supabase db reset

# Ou aplicar migration
supabase migration up
```

### 2. Criar usuário de teste
```sql
-- Executar no SQL Editor
\i server/supabase/seed-auth-user.sql
```

### 3. Verificar setup
```sql
-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verificar usuário criado
SELECT email, role FROM auth.users WHERE email = 'admin@pedped.com';

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'spatial_%';
```

---

## 📊 Estrutura do Banco

### Tabelas Principais

| Tabela | Propósito | RLS |
|--------|-----------|-----|
| `loja` | Configurações da loja | ✅ |
| `categorias` | Categorias de produtos | ✅ |
| `produtos` | Catálogo de produtos | ✅ |
| `kits` | Kits/combos | ✅ |
| `kit_itens` | Itens dos kits | ✅ |
| `promocoes` | Promoções ativas | ✅ |
| `promocao_produtos` | Produtos em promoção | ✅ |
| `clientes` | Base de clientes | ✅ |
| `enderecos_cliente` | Endereços de entrega | ✅ |
| `sessoes` | Sessões de compra | ✅ |
| `pedidos` | Pedidos realizados | ✅ |
| `itens_pedido` | Itens dos pedidos | ✅ |

### Triggers Automáticos

1. **Trigger 1: Congelamento de Preço**
   - Congela nome e preço do produto no momento da compra
   - Tabela: `itens_pedido`

2. **Trigger 2: Recálculo de Subtotal**
   - Recalcula `valor_subtotal` do pedido automaticamente
   - Tabela: `pedidos`

3. **Trigger 3: Métricas do Cliente**
   - Atualiza estatísticas do cliente (total_pedidos, valor_gasto, etc.)
   - Tabela: `clientes` (via `pedidos`)

---

## 🧪 Testes

### Testar autenticação do usuário seed

```bash
# Via curl (REST API)
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pedped.com",
    "password": "Admin@123456"
  }'
```

### Testar políticas RLS

```sql
-- Como usuário autenticado (deve retornar dados)
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SELECT * FROM clientes;

-- Como anônimo (deve retornar vazio)
SET ROLE anon;
SELECT * FROM clientes;
```

---

## 🔧 Manutenção

### Recriar usuário de teste

```sql
-- Deletar usuário existente
DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Executar seed novamente
\i server/supabase/seed-auth-user.sql
```

### Limpar dados de teste

```sql
-- Limpar pedidos e sessões
TRUNCATE TABLE itens_pedido, pedidos, sessoes CASCADE;

-- Limpar clientes (cuidado!)
TRUNCATE TABLE enderecos_cliente, clientes CASCADE;
```

---

## 📚 Referências

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostGIS](https://postgis.net/documentation/)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)

---

## ⚠️ Avisos Importantes

1. **Produção**: Alterar credenciais do usuário de teste
2. **Segurança**: Nunca commitar chaves reais no repositório
3. **Migrations**: Sempre testar em dev antes de aplicar em prod
4. **Backup**: Fazer backup antes de executar scripts destrutivos
