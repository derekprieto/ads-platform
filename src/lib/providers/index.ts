import { realImages, realLLM } from "../env";
import { anthropicLLM } from "./anthropic";
import { falImages } from "./fal";
import { mockImages } from "./mock";
import { ProviderError, type ImageGen, type LLM } from "./types";

export { ProviderError };

/** Primary + fallback image model. Swap ids after the blind test. */
export function imageProviders(): ImageGen[] {
  if (!realImages()) return [mockImages()];
  return [
    falImages(process.env.IMAGE_MODEL ?? "fal-ai/nano-banana-pro", process.env.IMAGE_EDIT_MODEL ?? "fal-ai/nano-banana-pro/edit", 15),
    falImages(process.env.IMAGE_FALLBACK_MODEL ?? "fal-ai/bytedance/seedream/v4/text-to-image", process.env.IMAGE_FALLBACK_EDIT_MODEL ?? "fal-ai/bytedance/seedream/v4/edit", 4),
  ];
}

export function llm(): LLM | null {
  return realLLM() ? anthropicLLM() : null;
}

/** Try each provider in order. Non-retryable errors on one still move to the next. */
export async function withFallback<T>(providers: ImageGen[], fn: (p: ImageGen) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const p of providers) {
    try { return await fn(p); } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : new ProviderError(String(last));
}
