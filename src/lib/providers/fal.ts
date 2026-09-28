import { fal } from "@fal-ai/client";
import { ProviderError, type ImageGen } from "./types";

/**
 * fal.ai image models. Model ids and prices are confirmed during the blind image test;
 * change them here or via env without touching the pipeline.
 */
export function falImages(model: string, editModel: string, centsPerImage: number): ImageGen {
  fal.config({ credentials: process.env.FAL_KEY });
  return {
    name: `fal:${model}`,
    async generate({ prompt, refImageUrls, aspect, n }) {
      try {
        const endpoint = refImageUrls?.length ? editModel : model;
        const input: Record<string, unknown> = { prompt, num_images: n, aspect_ratio: aspect, output_format: "png" };
        if (refImageUrls?.length) input.image_urls = refImageUrls;
        const res = await fal.subscribe(endpoint, { input });
        const urls = ((res.data as { images?: { url: string }[] }).images ?? []).map((i) => i.url);
        if (!urls.length) throw new ProviderError("no images returned");
        return { urls, costCents: centsPerImage * urls.length, provider: `fal:${endpoint}` };
      } catch (e) {
        throw e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : String(e));
      }
    },
    async edit({ imageUrl, prompt }) {
      try {
        const res = await fal.subscribe(editModel, { input: { prompt, image_urls: [imageUrl], num_images: 1, output_format: "png" } });
        const url = (res.data as { images?: { url: string }[] }).images?.[0]?.url;
        if (!url) throw new ProviderError("no image returned");
        return { url, costCents: centsPerImage, provider: `fal:${editModel}` };
      } catch (e) {
        throw e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : String(e));
      }
    },
  };
}
