import { createError } from 'h3'

/**
 * Normaliza e valida a URL base do provedor de WhatsApp
 * (`loja.whatsapp_api_base_url`, migration 093).
 *
 * Duas responsabilidades no mesmo lugar porque são a mesma decisão:
 *
 * 1. **Normalização (§3.4)** — `https://cloud.exemplo.com.br/` e
 *    `https://cloud.exemplo.com.br` têm que produzir exatamente a mesma
 *    chamada. `cloudApiPost` concatena `baseUrl + '/messages/send/text'`, então
 *    uma barra final vira `//messages` e depende do provedor tolerar.
 *
 * 2. **Defesa contra SSRF (§9)** — esta URL é editável pelo admin e vira
 *    destino de `fetch` **com o token do provedor no header**. Sem validação,
 *    um admin comprometido (ou enganado) exfiltra a credencial apontando a
 *    base para um host que ele controla, e alcança a rede interna/metadata do
 *    runtime. Por isso a validação é na ESCRITA, não na leitura: o valor
 *    persistido já é confiável, e o caminho quente não paga nada.
 *
 * Regras, em ordem de checagem — todas rejeitam com 400 e mensagem em
 * português, porque o destinatário é o lojista na tela de integrações:
 *
 * - `https://` obrigatório (o token viaja no header; em texto claro seria
 *   interceptável);
 * - sem credenciais embutidas (`user:pass@`), que o servidor repassaria;
 * - sem path, query ou fragmento — a base é só a origem; os caminhos vêm do
 *   `cloudApiClient`;
 * - host não pode ser IP literal. A §9 lista as faixas privadas, mas recusar
 *   **todo** literal (v4 e v6) é mais simples e estritamente mais seguro: um
 *   provedor real publica um nome, e formas exóticas de escrever `127.0.0.1`
 *   (decimal, octal, `::ffff:`) deixam de precisar de tratamento próprio;
 * - host precisa ser um nome qualificado (tem ponto e TLD alfabético), o que
 *   descarta `localhost` e nomes internos de rede de uma vez.
 *
 * O que esta função **não** cobre, deliberadamente: um nome público que
 * *resolve* para faixa privada (DNS rebinding). Checar exigiria resolver o DNS
 * na escrita — e o resultado poderia mudar depois, então a checagem daria uma
 * garantia falsa. O runtime Workers também não expõe resolver. A mitigação real
 * é a mesma da §9 para o resto: RBAC na escrita e log da alteração.
 */
export function normalizeProviderBaseUrl(input: string): string {
  const raw = input.trim()
  if (!raw) {
    throw invalid('Informe a URL base do provedor.')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw invalid('URL inválida. Use o formato https://api.seuprovedor.com.br')
  }

  if (url.protocol !== 'https:') {
    throw invalid('A URL do provedor precisa começar com https:// — o token vai no cabeçalho da requisição.')
  }

  if (url.username || url.password) {
    throw invalid('A URL não pode conter usuário e senha embutidos.')
  }

  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw invalid('Informe só o endereço base, sem caminho nem parâmetros (ex.: https://api.seuprovedor.com.br).')
  }

  const host = url.hostname.toLowerCase()

  // `new URL` normaliza IPv6 para a forma entre colchetes; IPv4 chega como veio.
  if (host.startsWith('[') || isIpLiteral(host)) {
    throw invalid('A URL do provedor precisa apontar para um domínio, não para um endereço IP.')
  }

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host)) {
    throw invalid('A URL do provedor precisa apontar para um domínio público (ex.: https://api.seuprovedor.com.br).')
  }

  return url.port ? `https://${host}:${url.port}` : `https://${host}`
}

/**
 * Literal IPv4 em qualquer das formas que o resolvedor aceita — não só a
 * pontuada. `http://2130706433` e `http://0177.0.0.1` chegam ao mesmo
 * `127.0.0.1`; tratar só `\d+\.\d+\.\d+\.\d+` deixaria o buraco aberto. Um
 * host que é puramente numérico/hexadecimal nunca é um domínio válido, então
 * recusar o conjunto inteiro não custa nada em falso positivo.
 */
function isIpLiteral(host: string): boolean {
  return /^[0-9.]+$/.test(host) || /^0x[0-9a-f.]+$/.test(host)
}

function invalid(message: string): ReturnType<typeof createError> {
  return createError({ statusCode: 400, statusMessage: message })
}
