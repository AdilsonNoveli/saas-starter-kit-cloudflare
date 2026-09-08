# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: instala dependências de produção e dev para o build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder: compila o app Nuxt
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@latest

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build gera .output/ (Nitro server + assets estáticos)
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner: imagem mínima de produção (sem node_modules de build)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copia apenas o output compilado — sem source, sem devDeps
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
