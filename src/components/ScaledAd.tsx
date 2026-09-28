"use client";

import { useEffect, useRef, useState } from "react";
import { AdCanvas, SIZES, type CanvasAd, type Format } from "@/lib/templates/AdCanvas";
import type { AdDTO } from "@/lib/api-types";
import type { AdCopy } from "@/db/schema";

/**
 * Renders the full-size ad canvas scaled down to fit. Pass `width` for a fixed size,
 * or leave it out to fill the parent's width (measured with ResizeObserver).
 */
export function ScaledAd({ ad, width, format = "4x5" }: { ad: CanvasAd; width?: number; format?: Format }) {
  const { w, h } = SIZES[format];
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    if (width || !ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => setMeasured(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  const size = width ?? measured;
  const scale = size / w;
  return (
    <div ref={ref} style={{ width: width ?? "100%", aspectRatio: `${w} / ${h}`, position: "relative", overflow: "hidden" }}>
      {size > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
          <AdCanvas ad={ad} format={format} />
        </div>
      )}
    </div>
  );
}

/** Ad preview with live layer text applied on top of the stored copy. */
export function canvasFor(ad: AdDTO, drafts: Record<string, string> = {}): CanvasAd | null {
  if (!ad.copy) return null;
  const copy: AdCopy = { ...ad.copy };
  for (const l of ad.layers) {
    const text = l.kind === "layer" && drafts[l.id] !== undefined ? drafts[l.id] : l.text;
    (copy as Record<string, unknown>)[l.field] = text;
  }
  return { id: ad.id, style: ad.style, copy, imageUrl: ad.imageUrl };
}

export const showsCanvas = (ad: AdDTO) => !!ad.copy && (ad.status === "ready" || ad.status === "rendering");

/** Gallery / thumbnail tile: skeleton while generating, small notice when failed. */
export function AdTile({ ad, width }: { ad: AdDTO; width?: number }) {
  if (ad.status === "failed") {
    return (
      <div className="flex items-center justify-center bg-subtle p-3 text-center text-[12px] leading-[1.4] text-muted" style={{ width: width ?? "100%", aspectRatio: "4 / 5" }}>
        failed, credits refunded
      </div>
    );
  }
  const c = showsCanvas(ad) ? canvasFor(ad) : null;
  if (!c) {
    return (
      <div className="flex animate-pulse items-center justify-center bg-[#EDEDED] text-[12px] text-muted" style={{ width: width ?? "100%", aspectRatio: "4 / 5" }}>
        {ad.status}...
      </div>
    );
  }
  return <ScaledAd ad={c} width={width} />;
}
