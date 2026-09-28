export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  falKey: process.env.FAL_KEY ?? "",
  authMode: (process.env.AUTH_MODE ?? "dev") as "dev" | "supabase",
  storageMode: (process.env.STORAGE_MODE ?? "local") as "local" | "supabase",
  generationEnabled: (process.env.GENERATION_ENABLED ?? "true") !== "false",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  /** Force mock providers even when keys exist (tests). */
  forceMock: process.env.PROVIDERS === "mock",
};
export const useRealLLM = () => !!env.anthropicKey && !env.forceMock;
export const useRealImages = () => !!env.falKey && !env.forceMock;
