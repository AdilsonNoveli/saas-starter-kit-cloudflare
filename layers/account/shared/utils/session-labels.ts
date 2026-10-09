// The browser and system names a session row carries when the User-Agent
// matches nothing known (SPEC-0010, AC-017). The server stores them as written
// (server/utils/user-agent.ts), and the session list compares a row against
// them to show the text in the person's language instead.
export const UNKNOWN_BROWSER = "Navegador desconhecido";
export const UNKNOWN_SYSTEM = "Sistema desconhecido";
