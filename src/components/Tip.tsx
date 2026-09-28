"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TipTopic } from "@/lib/client/chat";

const T = { fontSize: 12, fontFamily: "inherit" } as const;

const COPY: Record<TipTopic, [string, string]> = {
  funnel: ["Funnel stages", "Every ad has one job, based on how well people know you. Cold stops the scroll, Warm proves it, Hot closes."],
  angles: ["Angles", "An angle is the reason someone buys. New angles reach new people and beat ad fatigue."],
  gallery: ["Gallery", "Every ad you make lands here, sorted by funnel stage. Click one to edit. Remove the ones you won't run."],
  layers: ["Two kinds of text", "Text layers change instantly for free. Text drawn into the picture is repainted by AI for 1 credit."],
  credits: ["Credits", "You only pay for what you make. Text edits are free."],
  offer: ["What we learned", "We read your site once. Every ad uses this, so fix anything wrong."],
  formula: ["Hot ad formula", "Bottom of funnel ads that close: a number outcome + a guarantee + urgency + the end result they want."],
  account: ["Brand or agency", "Brands get one brand and simple plans. Agencies get a folder per client and a client switcher."],
};

function Diagram({ topic }: { topic: TipTopic }): ReactNode {
  const svg = (w: number, h: number, children: ReactNode) => (
    <svg style={{ maxWidth: "100%", height: "auto" }} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {children}
    </svg>
  );
  switch (topic) {
    case "funnel":
      return svg(248, 96, <>
        <polygon points="0,0 248,0 228,28 20,28" fill="#0A0A0A" />
        <polygon points="24,34 224,34 204,62 44,62" fill="#5E5E5E" />
        <polygon points="48,68 200,68 180,96 68,96" fill="#BDBDBD" />
        <text x="124" y="19" textAnchor="middle" {...T} fill="#FFFFFF">Cold · stop the scroll</text>
        <text x="124" y="53" textAnchor="middle" {...T} fill="#FFFFFF">Warm · prove it</text>
        <text x="124" y="87" textAnchor="middle" {...T} fill="#0A0A0A">Hot · close the sale</text>
      </>);
    case "angles":
      return svg(248, 96, <>
        <rect x="4" y="34" width="72" height="28" rx="6" fill="#0A0A0A" />
        <text x="40" y="52" textAnchor="middle" {...T} fill="#FFFFFF">Product</text>
        <path d="M76 48 L140 16 M76 48 L140 48 M76 48 L140 80" stroke="#0A0A0A" strokeWidth="1.5" fill="none" />
        {[4, 36, 68].map((y) => <rect key={y} x="140" y={y} width="104" height="24" rx="12" fill="#FFFFFF" stroke="#0A0A0A" />)}
        <text x="192" y="20" textAnchor="middle" fontSize="11" fill="#0A0A0A">Save time</text>
        <text x="192" y="52" textAnchor="middle" fontSize="11" fill="#0A0A0A">Look good</text>
        <text x="192" y="84" textAnchor="middle" fontSize="11" fill="#0A0A0A">Beat the old way</text>
      </>);
    case "gallery":
      return svg(248, 72, <>
        <rect x="0" y="0" width="56" height="70" rx="4" fill="#0A0A0A" />
        <rect x="64" y="0" width="56" height="70" rx="4" fill="#5E5E5E" />
        <rect x="128" y="0" width="56" height="70" rx="4" fill="#BDBDBD" />
        <rect x="192" y="0" width="56" height="70" rx="4" fill="#F0F0F0" stroke="#D4D4D4" />
        <path d="M208 22 L232 48 M232 22 L208 48" stroke="#8A8A8A" strokeWidth="2" />
      </>);
    case "layers":
      return svg(248, 96, <>
        <rect x="36" y="30" width="176" height="62" rx="6" fill="#BDBDBD" />
        <text x="124" y="80" textAnchor="middle" fontSize="11" fill="#0A0A0A">AI image · text in it = AI edit</text>
        <rect x="20" y="4" width="176" height="30" rx="6" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.5" />
        <text x="108" y="23" textAnchor="middle" fontSize="11" fill="#0A0A0A">Text layer · edit free, instantly</text>
      </>);
    case "credits":
      return svg(248, 64, <>
        <rect x="0" y="4" width="20" height="20" rx="3" fill="#0A0A0A" />
        <text x="30" y="19" {...T} fill="#0A0A0A">= 1 image ad</text>
        {[0, 24, 48, 72, 96].map((x) => <rect key={x} x={x} y="38" width="20" height="20" rx="3" fill="#0A0A0A" />)}
        <text x="124" y="53" {...T} fill="#0A0A0A">×2 = 1 video ad</text>
      </>);
    case "offer":
      return svg(248, 64, <>
        <rect x="0" y="8" width="84" height="48" rx="4" fill="#FFFFFF" stroke="#0A0A0A" />
        <rect x="0" y="8" width="84" height="10" rx="2" fill="#0A0A0A" />
        <text x="42" y="42" textAnchor="middle" fontSize="11" fill="#0A0A0A">Your site</text>
        <path d="M92 32 L148 32 M140 26 L148 32 L140 38" stroke="#0A0A0A" strokeWidth="1.5" fill="none" />
        <rect x="156" y="8" width="92" height="48" rx="4" fill="#F0F0F0" />
        <rect x="164" y="16" width="60" height="6" fill="#0A0A0A" />
        <rect x="164" y="28" width="72" height="4" fill="#8A8A8A" />
        <rect x="164" y="38" width="66" height="4" fill="#8A8A8A" />
        <rect x="164" y="46" width="48" height="4" fill="#8A8A8A" />
      </>);
    case "account":
      return svg(248, 72, <>
        <rect x="0" y="16" width="100" height="40" rx="6" fill="#FFFFFF" stroke="#0A0A0A" />
        <text x="50" y="40" textAnchor="middle" {...T} fill="#0A0A0A">Brand: 1 brand</text>
        <rect x="124" y="4" width="124" height="20" rx="4" fill="#0A0A0A" />
        <rect x="124" y="28" width="124" height="20" rx="4" fill="#5E5E5E" />
        <rect x="124" y="52" width="124" height="20" rx="4" fill="#BDBDBD" />
        <text x="186" y="18" textAnchor="middle" fontSize="11" fill="#FFFFFF">Agency: client 1</text>
        <text x="186" y="42" textAnchor="middle" fontSize="11" fill="#FFFFFF">client 2</text>
        <text x="186" y="66" textAnchor="middle" fontSize="11" fill="#0A0A0A">client 3...</text>
      </>);
    case "formula":
      return svg(248, 72, <>
        <rect x="0" y="0" width="120" height="32" rx="4" fill="#0A0A0A" />
        <rect x="128" y="0" width="120" height="32" rx="4" fill="#BDBDBD" />
        <rect x="0" y="40" width="120" height="32" rx="4" fill="#5E5E5E" />
        <rect x="128" y="40" width="120" height="32" rx="4" fill="#FFFFFF" stroke="#0A0A0A" />
        <text x="60" y="21" textAnchor="middle" {...T} fill="#FFFFFF">25 in 30 days</text>
        <text x="188" y="21" textAnchor="middle" {...T} fill="#0A0A0A">or you don&apos;t pay</text>
        <text x="60" y="61" textAnchor="middle" {...T} fill="#FFFFFF">1 per city</text>
        <text x="188" y="61" textAnchor="middle" {...T} fill="#0A0A0A">full calendar</text>
      </>);
  }
}

type Pos = { left: number; top: number | null; bottom: number | null; w: number };

/** (i) button with a fixed-position tooltip. Flips above when there is no room below, closes on scroll. */
export function Tip({ topic }: { topic: TipTopic }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const by = useRef<"hover" | "click" | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const [title, text] = COPY[topic];

  const place = (how: "hover" | "click") => {
    const el = btn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(272, vw - 16);
    const left = Math.max(8, Math.min(r.left, vw - w - 8));
    const below = vh - r.bottom, above = r.top;
    by.current = how;
    setPos(below < 250 && above > below ? { left, top: null, bottom: vh - r.top + 6, w } : { left, top: r.bottom + 6, bottom: null, w });
  };
  const close = () => {
    by.current = null;
    setPos(null);
  };

  useEffect(() => {
    if (!pos) return;
    const onScroll = (e: Event) => {
      if (box.current && e.target instanceof Node && box.current.contains(e.target)) return;
      close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || box.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  return (
    <span className="relative inline-flex shrink-0 items-center align-middle" onMouseEnter={() => !pos && place("hover")} onMouseLeave={() => by.current === "hover" && close()}>
      <button
        ref={btn}
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={!!pos}
        onClick={() => (pos && by.current === "click" ? close() : place("click"))}
        onFocus={() => !pos && place("hover")}
        onBlur={() => by.current === "hover" && close()}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#BDBDBD] bg-white p-0 text-[12px] font-semibold leading-none text-muted"
        style={{ cursor: "help" }}
      >
        i
      </button>
      {pos &&
        createPortal(
          <span
            ref={box}
            role="tooltip"
            className="flex flex-col gap-[10px] overflow-y-auto rounded-lg border border-line-strong bg-white p-3 text-left font-normal text-fg"
            style={{ position: "fixed", left: pos.left, top: pos.top ?? undefined, bottom: pos.bottom ?? undefined, width: pos.w, maxHeight: "calc(100vh - 16px)", zIndex: 1000, boxSizing: "border-box" }}
          >
            <span className="text-[14px] font-semibold">{title}</span>
            <Diagram topic={topic} />
            <span className="whitespace-normal text-[13px] leading-[1.45] text-[#404040]">{text}</span>
          </span>,
          document.body,
        )}
    </span>
  );
}
