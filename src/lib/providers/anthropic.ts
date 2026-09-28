import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getMedia } from "../storage";
import { ProviderError, type LLM } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
// $ per million tokens (input, output) for cost tracking.
const PRICE = { in: 4, out: 20 };

export function anthropicLLM(): LLM {
  const client = new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return {
    name: `anthropic:${MODEL}`,
    async json<T>({ system, prompt, schema, images }: { system: string; prompt: string; schema: z.ZodType<T>; images?: string[] }) {
      const content: Anthropic.ContentBlockParam[] = [];
      for (const url of images ?? []) {
        const bytes = await getMedia(url);
        content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: Buffer.from(bytes).toString("base64") } });
      }
      content.push({ type: "text", text: prompt });
      try {
        const res = await client.messages.parse({
          model: MODEL,
          max_tokens: 16000,
          system,
          output_config: { effort: "medium", format: zodOutputFormat(schema as never) },
          messages: [{ role: "user", content }],
        });
        if (res.stop_reason === "refusal") throw new ProviderError("model refused", false);
        if (!res.parsed_output) throw new ProviderError("no parsed output");
        const costCents = ((res.usage.input_tokens * PRICE.in + res.usage.output_tokens * PRICE.out) / 1_000_000) * 100;
        return { data: res.parsed_output as T, costCents, provider: `anthropic:${MODEL}` };
      } catch (e) {
        if (e instanceof ProviderError) throw e;
        if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.AuthenticationError) throw new ProviderError(String(e.message), false);
        throw new ProviderError(e instanceof Error ? e.message : String(e));
      }
    },
  };
}
