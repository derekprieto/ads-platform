import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { AdCanvas, SIZES, type CanvasAd, type Format } from "./templates/AdCanvas";
import { getMedia, putMedia } from "./storage";

let fonts: Awaited<ReturnType<typeof loadFonts>> | null = null;
async function loadFonts() {
  const f = (pkg: string, file: string) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));
  return [
    { name: "Inter", data: await f("inter", "inter-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: await f("inter", "inter-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: await f("inter", "inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
    { name: "Anton", data: await f("anton", "anton-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
    { name: "Caveat", data: await f("caveat", "caveat-latin-600-normal.woff"), weight: 600 as const, style: "normal" as const },
  ];
}

/** Render the final PNG exactly like the in-app preview. Images are inlined as data URIs. */
export async function renderPng(ad: CanvasAd, format: Format): Promise<Uint8Array> {
  fonts ??= await loadFonts();
  let imageUrl = ad.imageUrl;
  if (imageUrl && !imageUrl.startsWith("data:")) {
    const bytes = await getMedia(imageUrl);
    imageUrl = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  }
  const { w, h } = SIZES[format];
  const svg = await satori(<AdCanvas ad={{ ...ad, imageUrl }} format={format} />, { width: w, height: h, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng();
}

export async function renderAll(ad: CanvasAd) {
  const out: Record<string, string> = {};
  for (const f of ["4x5", "9x16"] as Format[]) out[f] = await putMedia(await renderPng(ad, f), "png", "renders");
  return out;
}
