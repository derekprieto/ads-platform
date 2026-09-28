import { Resvg } from "@resvg/resvg-js";
import { putMedia } from "../storage";
import type { ImageGen } from "./types";

const TONES = ["#3A3F4B", "#5B5145", "#2F3440", "#6A6152", "#4E4A44", "#55606E"];
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

function wrap(text: string, max = 34) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if ((line + " " + w).trim().length > max) { out.push(line.trim()); line = w; } else line += " " + w;
  }
  if (line.trim()) out.push(line.trim());
  return out.slice(0, 6);
}

/** Free placeholder images so the whole product works without API keys. */
export function mockImages(): ImageGen {
  const render = async (label: string, aspect: "4:5" | "9:16", seed: number, art?: string) => {
    const w = 540, h = aspect === "4:5" ? 675 : 960;
    const tone = TONES[seed % TONES.length];
    const lines = wrap(`[AI image: ${label}]`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${tone}"/>` +
      `<circle cx="${w * 0.7}" cy="${h * 0.35}" r="${w * 0.22}" fill="#ffffff" opacity="0.06"/>` +
      (art ? `<text x="${w / 2}" y="${h * 0.45}" font-family="cursive" font-size="54" fill="#FF7AD9" text-anchor="middle">${esc(art)}</text>` : "") +
      lines.map((l, i) => `<text x="${w / 2}" y="${h - 40 - (lines.length - 1 - i) * 22}" font-family="sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.7" text-anchor="middle">${esc(l)}</text>`).join("") +
      `</svg>`;
    const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
    return putMedia(png, "png", "mock");
  };
  return {
    name: "mock",
    async generate({ prompt, aspect, n }) {
      const scene = prompt.split("SCENE:")[1]?.split("\n")[0]?.trim() ?? prompt.slice(0, 80);
      const art = prompt.match(/spelled exactly: "([^"]+)"/)?.[1];
      const urls = await Promise.all(Array.from({ length: n }, (_, i) => render(scene, aspect, prompt.length + i, art)));
      return { urls, costCents: 0, provider: "mock" };
    },
    async edit({ prompt }) {
      const art = prompt.match(/reads exactly: "([^"]+)"/)?.[1];
      return { url: await render("edited image", "4:5", prompt.length, art), costCents: 0, provider: "mock" };
    },
  };
}
