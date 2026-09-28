import type { z } from "zod";

export type Cost = { costCents: number; provider: string };

export interface LLM {
  name: string;
  json<T>(opts: { system: string; prompt: string; schema: z.ZodType<T>; images?: string[] }): Promise<{ data: T } & Cost>;
}

export interface ImageGen {
  name: string;
  generate(opts: { prompt: string; refImageUrls?: string[]; aspect: "4:5" | "9:16"; n: number }): Promise<{ urls: string[] } & Cost>;
  /** Edit an existing image (e.g. change the words on a neon sign). */
  edit(opts: { imageUrl: string; prompt: string }): Promise<{ url: string } & Cost>;
}

export class ProviderError extends Error {
  constructor(msg: string, public retryable = true) { super(msg); }
}
