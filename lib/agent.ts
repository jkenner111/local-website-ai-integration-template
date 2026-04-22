import { createOpenAI } from "@ai-sdk/openai";

const baseURL = process.env.QWEN_BASE_URL ?? "http://10.0.25.2:8085/v1";
const modelId = process.env.QWEN_MODEL ?? "qwen3.5-122b";

// vLLM needs chat_template_kwargs.enable_thinking=false to suppress the
// <think>…</think> preamble that otherwise eats output tokens. The AI SDK
// doesn't expose a passthrough for non-standard body fields, so we inject
// via a wrapping fetch.
const patchedFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body);
      body.chat_template_kwargs = {
        ...(body.chat_template_kwargs ?? {}),
        enable_thinking: false,
      };
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // Leave non-JSON bodies alone
    }
  }
  return fetch(input, init);
};

const provider = createOpenAI({
  baseURL,
  apiKey: "local-qwen",
  fetch: patchedFetch,
});

// provider(modelId) defaults to the Responses API; vLLM only implements
// Chat Completions cleanly, so bind explicitly.
export const qwen = provider.chat(modelId);
