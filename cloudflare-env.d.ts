declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    MISTRAL_API_KEY?: string;
    MISTRAL_MODEL?: string;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    AI_DAILY_REQUEST_LIMIT?: string;
  }
}
