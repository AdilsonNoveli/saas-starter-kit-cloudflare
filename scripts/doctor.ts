// Preflight de deploy: falha ANTES do `sst deploy` com a instrução exata de correção.
// Uso: `bun run doctor [-- --stage <nome>]`. `bun run deploy` roda este script sozinho
// (scripts/deploy.ts) e repassa o mesmo --stage.
//
// Só bloqueia (exit 1) o que com certeza quebra o deploy. O que não dá para provar daqui
// (zona do domínio, Cloudflare fora do ar) vira aviso `!` e não impede o deploy.
// Nunca imprime valores de secrets.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BrandingError, envFileName as stageEnvFile, loadBranding, type Branding } from "./branding";

const root = join(import.meta.dir, "..");
const problems: string[] = [];
const warnings: string[] = [];
const fail = (what: string, fix: string) => problems.push(`✗ ${what}\n    → ${fix}`);
const warn = (what: string, hint: string) => warnings.push(`! ${what}\n    → ${hint}`);
const ok = (what: string) => console.log(`✓ ${what}`);

// Stage vem de `--stage <nome>` / `--stage=<nome>` (mesma flag do sst). Sem flag, o SST usa
// o usuário do sistema — um stage de desenvolvimento.
const args = process.argv.slice(2);
const stageFlag = args.findIndex((a) => a === "--stage" || a.startsWith("--stage="));
const stage =
  stageFlag === -1
    ? "dev"
    : args[stageFlag].includes("=")
      ? args[stageFlag].slice("--stage=".length)
      : (args[stageFlag + 1] ?? "dev");
const isProduction = stage === "production";
// Produção tem arquivo próprio e NUNCA usa --fallback (senão vazaria como default para os
// outros stages). Todo outro stage usa .env.stage com --fallback.
const envFileName = stageEnvFile(stage);
const loadCommand = isProduction
  ? "bunx sst secret load .env.production --stage production"
  : "bunx sst secret load .env.stage --fallback";
console.log(`Stage: ${isProduction ? "production" : `${stage} (desenvolvimento)`}\n`);

// 1. Links dos workspaces (@nuxfire/*) — ausentes quando node_modules foi copiado ou está velho.
const missing: string[] = [];
for (const dir of ["apps", "packages", "layers"]) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const pkgPath = join(root, dir, entry.name, "package.json");
    if (!entry.isDirectory() || !existsSync(pkgPath)) continue;
    const name: string | undefined = JSON.parse(readFileSync(pkgPath, "utf8")).name;
    if (name && !existsSync(join(root, "node_modules", name))) missing.push(name);
  }
}
missing.length
  ? fail(
      `Workspaces sem link em node_modules: ${missing.join(", ")}`,
      "Rode `bun install` na raiz (nunca copie a pasta node_modules).",
    )
  : ok("Workspaces @nuxfire/* linkados");

// 2. Credenciais Cloudflare no shell (não podem ser sst.Secret).
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
!token || !accountId
  ? fail(
      "CLOUDFLARE_API_TOKEN e/ou CLOUDFLARE_ACCOUNT_ID ausentes no shell",
      'PowerShell: $env:CLOUDFLARE_API_TOKEN="..."; $env:CLOUDFLARE_ACCOUNT_ID="..."  |  bash: export CLOUDFLARE_API_TOKEN=...',
    )
  : ok("Credenciais Cloudflare presentes no shell");

// 3. Arquivo de secrets do stage com o banco preenchido. Sem valor, o Hyperdrive é criado
// com credenciais vazias e a Cloudflare recusa o deploy com um 400 pouco claro.
const required = ["DATABASE_HOST", "DATABASE_PORT", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD"];
const envFile = join(root, envFileName);
if (!existsSync(envFile)) {
  // Quem carregou os secrets com `sst secret set` não tem o arquivo: não dá para provar
  // que falta algo, então só avisa.
  warn(
    `${envFileName} não existe — não foi possível conferir o DATABASE_*`,
    `Copie .env.example para ${envFileName}, preencha e rode \`${loadCommand}\`.`,
  );
} else {
  const values = new Map(
    readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l): [string, string] => [
        l.slice(0, l.indexOf("=")).trim(),
        l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
      ]),
  );
  const empty = required.filter((k) => !values.get(k));
  empty.length
    ? fail(`${envFileName} com valores vazios: ${empty.join(", ")}`, `Preencha e rode \`${loadCommand}\`.`)
    : ok(`${envFileName} com DATABASE_* preenchidos`);
}

// 4. Branding (BRAND_NAME / BRAND_DOMAIN / BRAND_EMAIL) — a mesma leitura e validação que o
// deploy faz em infra/branding.ts, para falhar aqui, com todos os problemas de uma vez.
let branding: Branding | undefined;
try {
  branding = loadBranding({ stage, root });
  ok(`Branding: ${branding.name} · ${branding.domain} · ${branding.email}`);
  const senderHost = branding.email.slice(branding.email.lastIndexOf("@") + 1);
  if (senderHost !== branding.domain && !senderHost.endsWith(`.${branding.domain}`)) {
    warn(
      `BRAND_EMAIL usa outro domínio (${senderHost}) que não é ${branding.domain} nem subdomínio dele`,
      "Está correto se o seu provedor de e-mail verificou esse domínio; senão os envios serão recusados.",
    );
  }
} catch (e) {
  if (!(e instanceof BrandingError)) throw e;
  fail(
    `Branding inválido em ${e.file}`,
    `${e.issues.join("\n      ")}\n      (modelo: seção "Branding" do .env.example)`,
  );
}

// 5. Token válido (bloqueia) e zona do domínio visível (só avisa).
if (token && accountId) {
  type CloudflareReply = { success: boolean; result?: { status?: string } | unknown[] };
  const api = async (path: string): Promise<CloudflareReply> =>
    (await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
  const isActive = (r: CloudflareReply) =>
    r.success && !Array.isArray(r.result) && r.result?.status === "active";
  try {
    // O passo a passo cria um Account API Token, que só é verificável pela rota da conta.
    // A rota de usuário cobre quem usou um token pessoal.
    const verified =
      isActive(await api(`/accounts/${accountId}/tokens/verify`)) ||
      isActive(await api("/user/tokens/verify"));
    if (!verified) {
      fail(
        "CLOUDFLARE_API_TOKEN inválido, expirado ou de outra conta",
        "Crie um Account API Token em Manage Account → Account API Tokens (veja https://nuxfire.com/docs/saas-starter-kit/getting-started/cloudflare-access) e confira o CLOUDFLARE_ACCOUNT_ID.",
      );
    } else {
      ok("Token Cloudflare válido");
      // O token do passo a passo pode não ter Zone:Read, então zona não listada não prova
      // erro — mas um domínio que não está na conta derruba o deploy mais adiante.
      if (branding) {
        const zones = await api(
          `/zones?name=${encodeURIComponent(branding.domain)}&account.id=${accountId}`,
        );
        Array.isArray(zones.result) && zones.result.length
          ? ok(`Zona ${branding.domain} encontrada na conta`)
          : warn(
              `Zona "${branding.domain}" não apareceu na conta ${accountId}`,
              `Confirme que ${branding.domain} (BRAND_DOMAIN) foi adicionado à MESMA conta Cloudflare do token e está com nameservers ativos. Se já está, talvez o token só não tenha Zone:Read.`,
            );
      }
    }
  } catch (e) {
    warn(
      `Não foi possível consultar a API da Cloudflare (${(e as Error).message})`,
      "Verifique a conexão; token e zona não foram conferidos.",
    );
  }
}

if (warnings.length) console.warn(`\n${warnings.length} aviso(s):\n\n${warnings.join("\n\n")}`);
if (problems.length) {
  console.error(`\n${problems.length} problema(s) impedem o deploy:\n\n${problems.join("\n\n")}\n`);
  process.exit(1);
}
console.log("\nTudo certo para o deploy.");
