import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.join(process.cwd(), ".data", "media");

/** Save bytes and return a URL the app can serve. Local disk in dev; swap for Supabase Storage in prod. */
export async function putMedia(bytes: Uint8Array, ext: "png" | "jpg" | "webp", folder = "misc"): Promise<string> {
  const name = `${folder}/${randomUUID()}.${ext}`;
  const file = path.join(ROOT, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return `/media/${name}`;
}

export async function getMedia(url: string): Promise<Uint8Array> {
  if (url.startsWith("/media/")) {
    const rel = url.slice("/media/".length);
    if (rel.includes("..")) throw new Error("bad path");
    return new Uint8Array(await readFile(path.join(ROOT, rel)));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Import a remote image (e.g. provider CDN url) into our storage so it never expires. */
export async function importRemote(url: string, folder: string): Promise<string> {
  const bytes = await getMedia(url);
  const ext = url.includes(".jpg") || url.includes(".jpeg") ? "jpg" : url.includes(".webp") ? "webp" : "png";
  return putMedia(bytes, ext, folder);
}

export function mediaPath(rel: string) {
  if (rel.includes("..")) throw new Error("bad path");
  return path.join(ROOT, rel);
}
