/**
 * One renderer for every ad. Used in the browser (live preview + editor) and on the
 * server by satori (final PNGs), so what you see is exactly what you download.
 * Satori rules: every element with >1 child needs display:flex, no CSS grid, inline styles only.
 */
import type { CSSProperties, ReactNode } from "react";
import type { AdCopy } from "@/db/schema";
import { styleByKey, toneFor } from "@/lib/styles";

export type CanvasAd = { id: string; style: string; copy: AdCopy; imageUrl: string | null };
export type Format = "4x5" | "9x16";
export const SIZES: Record<Format, { w: number; h: number }> = { "4x5": { w: 1080, h: 1350 }, "9x16": { w: 1080, h: 1920 } };

const SANS = "Inter";
const MEME = "Anton";
const HAND = "Caveat";

const col = (s: CSSProperties = {}): CSSProperties => ({ display: "flex", flexDirection: "column", ...s });
const row = (s: CSSProperties = {}): CSSProperties => ({ display: "flex", flexDirection: "row", ...s });
const outline = "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000";

function Star({ size = 52 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.6 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z" fill="#E08A00" /></svg>;
}
function Check({ ok, size = 40 }: { ok: boolean; size?: number }) {
  return ok
    ? <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke="#0A7A45" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#9A9A9A" strokeWidth="3.2" fill="none" strokeLinecap="round" /></svg>;
}

/** Shrink big text as it gets longer so it never overflows the canvas. */
function fit(text: string | undefined, base: number, min: number, perChar = 28) {
  const n = (text ?? "").length;
  return n <= perChar ? base : Math.max(min, Math.round(base * Math.sqrt(perChar / n)));
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function Bg({ url, tone, children, pad = 72, justify = "flex-start", dim = 0 }: { url: string | null; tone: string; children: ReactNode; pad?: number; justify?: CSSProperties["justifyContent"]; dim?: number }) {
  return (
    <div style={col({ position: "relative", width: "100%", height: "100%", backgroundColor: tone, overflow: "hidden" })}>
      {url ? <img src={url} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {url && dim ? <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: "100%", height: "100%", backgroundColor: `rgba(0,0,0,${dim})` }} /> : null}
      <div style={col({ position: "relative", width: "100%", height: "100%", padding: pad, justifyContent: justify, boxSizing: "border-box" })}>{children}</div>
    </div>
  );
}

export function AdCanvas({ ad, format = "4x5" }: { ad: CanvasAd; format?: Format }) {
  const { w, h } = SIZES[format];
  const st = styleByKey(ad.style);
  const c = ad.copy;
  const tone = toneFor(ad.style, ad.id);
  const fg = isLight(tone) ? "#0A0A0A" : "#FFFFFF";
  const img = ad.imageUrl;

  let body: ReactNode;
  switch (st.template) {
    case "meme":
      body = (
        <Bg url={img} tone={tone} pad={56} justify="space-between">
          <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: MEME, fontSize: fit(c.headline, 104, 64, 24), lineHeight: 1.05, color: "#FFF", textShadow: outline, textTransform: "uppercase" }}>{c.headline}</div>
          <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: MEME, fontSize: fit(c.sub, 104, 64, 24), lineHeight: 1.05, color: "#FFF", textShadow: outline, textTransform: "uppercase" }}>{c.sub ?? ""}</div>
        </Bg>
      );
      break;
    case "photo":
      body = (
        <Bg url={img} tone={tone} pad={72}>
          <div style={{ display: "flex", alignSelf: "center", marginTop: 120, maxWidth: 860, backgroundColor: "#FFFFFF", color: "#0A0A0A", padding: "22px 30px", borderRadius: 16, fontFamily: SANS, fontWeight: 700, fontSize: fit(c.headline, 52, 38, 60), lineHeight: 1.25, textAlign: "center" }}>{c.headline}</div>
        </Bg>
      );
      break;
    case "art":
      body = <Bg url={img} tone={tone}>{img ? null : <div style={{ display: "flex", margin: "auto", fontFamily: HAND, fontSize: 120, color: "#FF7AD9", textAlign: "center" }}>{c.artText ?? c.headline}</div>}</Bg>;
      break;
    case "tweet":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: "#FFFFFF", padding: 96, justifyContent: "center", gap: 40, fontFamily: SANS, color: "#0F1419", boxSizing: "border-box" })}>
          <div style={row({ alignItems: "center", gap: 28 })}>
            <div style={{ display: "flex", width: 120, height: 120, borderRadius: 60, backgroundColor: "#CFD9DE" }} />
            <div style={col({ gap: 4 })}>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{(c.handle ?? "@user").replace("@", "")}</div>
              <div style={{ display: "flex", fontSize: 40, color: "#536471" }}>{c.handle ?? "@user"}</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: fit(c.headline, 62, 44, 90), lineHeight: 1.3 }}>{c.headline}</div>
          <div style={{ display: "flex", fontSize: 36, color: "#536471" }}>12.4K likes · 890 reposts</div>
        </div>
      );
      break;
    case "notes":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: "#FFFFFF", padding: "72px 80px", gap: 48, fontFamily: SANS, color: "#1C1C1E", boxSizing: "border-box" })}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#D4A017" }}>‹ Notes</div>
          <div style={col({ gap: 10 })}>
            {c.headline.split("\n").map((l, i) => <div key={i} style={{ display: "flex", fontSize: 58, lineHeight: 1.4, minHeight: 40 }}>{l}</div>)}
          </div>
        </div>
      );
      break;
    case "graphic":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: tone, overflow: "hidden" })}>
          <div style={col({ gap: 44, padding: 96, flexGrow: img ? 0 : 1, justifyContent: "center", boxSizing: "border-box" })}>
            <div style={{ display: "flex", fontFamily: SANS, fontWeight: 800, fontSize: fit(c.headline, img ? 96 : 116, 60), lineHeight: 1.05, color: fg, letterSpacing: -2 }}>{c.headline}</div>
            {c.cta ? <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: fg === "#FFFFFF" ? "#FFFFFF" : "#0A0A0A", color: fg === "#FFFFFF" ? "#0A0A0A" : "#FFFFFF", fontFamily: SANS, fontWeight: 700, fontSize: 48, padding: "24px 44px", borderRadius: 60 }}>{c.cta}</div> : null}
          </div>
          {img ? <div style={{ display: "flex", flexGrow: 1, position: "relative" }}><img src={img} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} /></div> : null}
        </div>
      );
      break;
    case "review":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: "#FFFFFF", fontFamily: SANS, color: "#0A0A0A" })}>
          <div style={col({ padding: "72px 80px 40px", gap: 24 })}>
            <div style={row({ gap: 6 })}><Star /><Star /><Star /><Star /><Star /></div>
            <div style={{ display: "flex", fontSize: fit(c.headline, 60, 42, 60), fontWeight: 700, lineHeight: 1.25 }}>“{c.headline}”</div>
            <div style={{ display: "flex", fontSize: 38, color: "#5E5E5E" }}>{(c.sub ?? "") + " · Verified buyer"}</div>
          </div>
          <div style={{ display: "flex", flexGrow: 1, position: "relative", backgroundColor: tone }}>
            {img ? <img src={img} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
        </div>
      );
      break;
    case "vs":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: "#FFFFFF", padding: 80, gap: 40, fontFamily: SANS, color: "#0A0A0A", justifyContent: "center", boxSizing: "border-box" })}>
          <div style={row({ gap: 24 })}>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", backgroundColor: "#1B4DFF", color: "#FFF", fontWeight: 800, fontSize: 56, padding: 28, borderRadius: 12 }}>{c.headline}</div>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", backgroundColor: "#EDEDED", fontWeight: 800, fontSize: 56, padding: 28, borderRadius: 12 }}>{c.sub ?? ""}</div>
          </div>
          {(c.rows ?? []).map((r, i) => (
            <div key={i} style={row({ gap: 24, fontSize: 46, lineHeight: 1.25 })}>
              <div style={row({ flex: 1, gap: 14, alignItems: "center" })}><Check ok /><div style={{ display: "flex", flex: 1 }}>{r.l}</div></div>
              <div style={row({ flex: 1, gap: 14, alignItems: "center", color: "#6B6B6B" })}><Check ok={false} /><div style={{ display: "flex", flex: 1 }}>{r.r}</div></div>
            </div>
          ))}
        </div>
      );
      break;
    case "list":
      body = (
        <div style={col({ width: "100%", height: "100%", backgroundColor: "#FFF3C4", padding: 96, gap: 48, fontFamily: SANS, color: "#0A0A0A", justifyContent: "center", boxSizing: "border-box" })}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.1 }}>{c.headline}</div>
          {(c.items ?? []).map((t, i) => (
            <div key={i} style={row({ gap: 28, fontSize: 56, lineHeight: 1.25 })}>
              <div style={{ display: "flex", fontWeight: 800 }}>{`${i + 1}.`}</div>
              <div style={{ display: "flex", flex: 1 }}>{t}</div>
            </div>
          ))}
        </div>
      );
      break;
    case "shots":
      body = (
        <Bg url={img} tone="#D9DCE1" pad={72} justify="space-between">
          <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: "#0A0A0A", color: "#FFF", fontFamily: SANS, fontWeight: 700, fontSize: 50, padding: "18px 28px", borderRadius: 10 }}>{c.headline}</div>
          <div style={{ display: "flex", alignSelf: "flex-end", backgroundColor: "#FFE24A", color: "#0A0A0A", fontFamily: SANS, fontWeight: 700, fontSize: 50, padding: "18px 28px", borderRadius: 10 }}>{c.sub ?? ""}</div>
        </Bg>
      );
      break;
    case "formula":
      body = (
        <Bg url={img} tone={tone} pad={88} dim={0.45}>
          <div style={col({ gap: 28, maxWidth: 880 })}>
            <div style={{ display: "flex", fontFamily: SANS, fontWeight: 800, fontSize: 280, lineHeight: 0.95, color: "#FFFFFF", letterSpacing: -8 }}>{c.big ?? ""}</div>
            <div style={{ display: "flex", fontFamily: SANS, fontWeight: 800, fontSize: fit(c.headline, 72, 48, 40), lineHeight: 1.1, color: "#FFFFFF" }}>{c.headline}</div>
            <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: "#FFE24A", color: "#0A0A0A", fontFamily: SANS, fontWeight: 800, fontSize: 56, padding: "16px 28px", borderRadius: 10 }}>{c.sub ?? ""}</div>
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontFamily: SANS, fontWeight: 700, fontSize: 42, lineHeight: 1.3, color: "rgba(255,255,255,0.9)" }}>{c.extra ?? ""}</div>
        </Bg>
      );
      break;
  }

  return <div style={{ display: "flex", width: w, height: h, overflow: "hidden", backgroundColor: "#FFFFFF" }}>{body}</div>;
}
