import test from "node:test";
import assert from "node:assert/strict";
import { createAIRouter } from "../lib/ai/providers.ts";

test("Gemini is preferred and receives only the supplied aggregate context", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "**Your verified leak total is 812 MAD.**" }] } }] }), { status: 200 });
  };
  const result = await createAIRouter({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: "gemini-test", GROQ_API_KEY: "backup-key" }, fakeFetch).analyze("Where is my money going?", { currency: "MAD", monthlyIncome: 10_000, smallTransactionTotal: 812 });
  assert.equal(result?.provider, "gemini");
  assert.equal(result?.text, "Your verified leak total is 812 MAD.");
  assert.match(requestUrl, /gemini-test:generateContent$/);
  assert.equal(new Headers(requestInit?.headers).get("x-goog-api-key"), "test-key");
  const payload = JSON.parse(String(requestInit?.body));
  assert.match(payload.contents[0].parts[0].text, /"currency":"MAD"/);
  assert.match(payload.contents[0].parts[0].text, /"smallTransactionTotal":812/);
  assert.doesNotMatch(payload.contents[0].parts[0].text, /full ledger/i);
});

test("router returns null without keys so the local CFO remains available", async () => {
  const result = await createAIRouter({}).analyze("Can I afford this?", { availableCents: 400_000 });
  assert.equal(result, null);
});

test("router tries the next configured provider when Gemini fails", async () => {
  const fakeFetch: typeof fetch = async (input) => {
    if (String(input).includes("generativelanguage")) return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "Backup answer" } }] }), { status: 200 });
  };
  const result = await createAIRouter({ GEMINI_API_KEY: "gemini-key", GROQ_API_KEY: "groq-key" }, fakeFetch).analyze("Summarize", { spentCents: 100_000 });
  assert.deepEqual(result, { provider: "groq", text: "Backup answer" });
});
