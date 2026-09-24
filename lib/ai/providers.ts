export type AIProviderName = "gemini" | "groq" | "mistral" | "openrouter" | "local";
export type FinancialContext = Record<string, string | number | boolean | null | Array<unknown>>;
type Fetcher = typeof fetch;

const SYSTEM_PROMPT = "You are a cautious personal finance analyst. Use only the verified aggregate context. Never invent amounts. Every monetary value is already expressed in the named profile currency, not cents. Always write that currency code after amounts. Return concise plain text only: no Markdown, headings, asterisks, or tables.";

function plainText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`/g, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1800);
}

export interface AIProvider {
  name: AIProviderName;
  available(): boolean;
  analyze(prompt: string, context: FinancialContext): Promise<string>;
}

abstract class OpenAICompatibleProvider implements AIProvider {
  abstract name: AIProviderName;
  protected apiKey: string | undefined;
  protected endpoint: string;
  protected model: string;
  protected fetcher: Fetcher;
  constructor(apiKey: string | undefined, endpoint: string, model: string, fetcher: Fetcher) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.model = model;
    this.fetcher = fetcher;
  }
  available() { return Boolean(this.apiKey); }
  async analyze(prompt: string, context: FinancialContext) {
    if (!this.apiKey) throw new Error(`${this.name} is not configured`);
    const response = await this.fetcher(this.endpoint, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, temperature: 0.2, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `${prompt}\nVerified context: ${JSON.stringify(context)}` }] }) });
    if (!response.ok) throw new Error(`${this.name} request failed`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return plainText(String(data.choices?.[0]?.message?.content ?? ""));
  }
}

class GroqProvider extends OpenAICompatibleProvider { name = "groq" as const; }
class MistralProvider extends OpenAICompatibleProvider { name = "mistral" as const; }
class OpenRouterProvider extends OpenAICompatibleProvider { name = "openrouter" as const; }

class GeminiProvider implements AIProvider {
  name = "gemini" as const;
  private apiKey: string | undefined;
  private model: string;
  private fetcher: Fetcher;
  constructor(apiKey: string | undefined, model: string, fetcher: Fetcher) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetcher = fetcher;
  }
  available() { return Boolean(this.apiKey); }
  async analyze(prompt: string, context: FinancialContext) {
    if (!this.apiKey) throw new Error("gemini is not configured");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const response = await this.fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `${prompt}\nVerified context: ${JSON.stringify(context)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    });
    if (!response.ok) throw new Error("gemini request failed");
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return plainText((data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join(""));
  }
}

export function createAIRouter(env: Record<string, string | undefined>, fetcher: Fetcher = fetch) {
  const providers: AIProvider[] = [
    new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? "gemini-3.5-flash-lite", fetcher),
    new GroqProvider(env.GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", env.GROQ_MODEL ?? "llama-3.1-8b-instant", fetcher),
    new MistralProvider(env.MISTRAL_API_KEY, "https://api.mistral.ai/v1/chat/completions", env.MISTRAL_MODEL ?? "mistral-small-latest", fetcher),
    new OpenRouterProvider(env.OPENROUTER_API_KEY, "https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_MODEL ?? "openrouter/free", fetcher),
  ];
  return {
    provider: providers.find((provider) => provider.available()) ?? null,
    async analyze(prompt: string, context: FinancialContext) {
      for (const provider of providers) {
        if (!provider.available()) continue;
        try {
          const text = await provider.analyze(prompt, context);
          if (text) return { provider: provider.name, text };
        } catch {
          // Continue to the next configured provider. The caller still owns the local fallback.
        }
      }
      return null;
    },
  };
}
