"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { Tip } from "./Tip";
import { canvasFor, ScaledAd } from "./ScaledAd";
import { api, ApiError, errMsg } from "@/lib/client/api";
import { isPending, STAGE_NAME } from "@/lib/client/chat";
import { styleByKey } from "@/lib/styles";
import type { AdDTO } from "@/lib/api-types";

const DEBOUNCE = 500;

function EditorPanel({ ad, close }: { ad: AdDTO; close: () => void }) {
  const { dispatch, toast } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [artDrafts, setArtDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsaved = useRef<Record<string, string>>({});
  const panel = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(320);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const layers = Object.entries(unsaved.current).map(([id, text]) => ({ id, text }));
    unsaved.current = {};
    if (!layers.length) return;
    api.patchAd(ad.id, { layers }).then(
      (r) => dispatch({ type: "adUpdated", ad: r.ad }),
      (e) => toast(`Couldn't save: ${errMsg(e)}`),
    );
  };
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => flushRef.current(), []);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const ro = new ResizeObserver((en) => setPreviewW(Math.min(360, Math.floor(en[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const editLayer = (id: string, text: string) => {
    setDrafts((d) => ({ ...d, [id]: text }));
    unsaved.current[id] = text;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), DEBOUNCE);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof ApiError && e.insufficient ? "Not enough credits. Top up to keep going." : errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const resetFrom = (next: AdDTO) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    unsaved.current = {};
    setDrafts({});
    dispatch({ type: "adUpdated", ad: next });
  };

  const canvas = canvasFor(ad, drafts);
  const hasTextLayer = ad.layers.some((l) => l.kind === "layer");
  const updating = isPending(ad);

  return (
    <div ref={panel} className="flex flex-col gap-5">
      <div className="relative self-center overflow-hidden rounded-lg border border-line" style={{ width: previewW }}>
        {canvas ? <ScaledAd ad={canvas} width={previewW} /> : <div style={{ width: previewW, aspectRatio: "4 / 5" }} className="bg-[#EDEDED]" />}
        {updating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-[14px] font-semibold" role="status">
            Updating the image with AI...
          </div>
        )}
      </div>

      {ad.layers.map((l) => {
        const art = l.kind === "art";
        const value = art ? (artDrafts[l.id] ?? l.text) : (drafts[l.id] ?? l.text);
        const fid = `layer-${l.id}`;
        return (
          <div key={l.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={fid} className="text-[14px] font-semibold">
                {l.label}
              </label>
              <span className={`rounded-[10px] px-2 py-[3px] text-[12px] ${art ? "bg-fg text-white" : "border border-line-strong text-[#404040]"}`}>
                {art ? "In the image · AI edit" : "Text layer · instant, free"}
              </span>
            </div>
            <textarea
              id={fid}
              rows={2}
              value={value}
              disabled={updating && art}
              onChange={(e) => (art ? setArtDrafts((d) => ({ ...d, [l.id]: e.target.value })) : editLayer(l.id, e.target.value))}
              className="field resize-y"
            />
            {art && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span className="min-w-0 flex-[1_1_200px] text-[12px] leading-[1.4] text-muted">This text is drawn into the picture. AI repaints just this spot in the same style.</span>
                <button
                  type="button"
                  className="btn btn-primary h-9 shrink-0 text-[13px]"
                  disabled={!!busy || updating}
                  onClick={() => {
                    const text = artDrafts[l.id];
                    if (text === undefined || text === l.text) return toast("Change the text first");
                    run("art", async () => {
                      const r = await api.artEdit(ad.id, text);
                      dispatch({ type: "adUpdated", ad: r.ad });
                      setArtDrafts((d) => {
                        const n = { ...d };
                        delete n[l.id];
                        return n;
                      });
                      api.credits().then((c) => dispatch({ type: "credits", balance: c.balance }), () => {});
                    });
                  }}
                >
                  Update · 1 credit
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-auto flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn min-w-0"
            disabled={!!busy || updating}
            onClick={() => {
              if (!hasTextLayer) return toast("This text is part of the image. Edit it above.");
              run("headline", async () => resetFrom((await api.headline(ad.id)).ad));
            }}
          >
            New headline · free
          </button>
          <button type="button" className="btn min-w-0" disabled={!ad.canUndo || !!busy || updating} onClick={() => run("undo", async () => resetFrom((await api.undo(ad.id)).ad))}>
            Undo
          </button>
        </div>
        <button
          type="button"
          className="btn"
          disabled={!!busy}
          onClick={() =>
            run("more", async () => {
              const r = await api.more(ad.id);
              dispatch({ type: "adsAdded", ads: r.ads, afterId: ad.id });
              toast("3 new versions added next to it");
              close();
            })
          }
        >
          Make 3 more like this · 3 credits
        </button>
        <button type="button" className="btn btn-primary" onClick={close}>
          Done
        </button>
      </div>
    </div>
  );
}

export function Editor() {
  const { state, editId, setEditId } = useApp();
  const ad = state.ads.find((a) => a.id === editId);
  if (!ad) return null;
  const close = () => setEditId(null);
  const meta = `${STAGE_NAME[ad.stage]} · ${styleByKey(ad.style).name}${ad.angle ? ` · Angle: ${ad.angle}` : ""}`;
  return (
    <div className="fixed inset-0 z-[900] flex justify-end bg-[rgba(10,10,10,0.45)]" onClick={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-title" className="box-border flex h-full w-[520px] max-w-full flex-col gap-5 overflow-y-auto bg-white p-7 max-[820px]:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span id="edit-title" className="flex items-center gap-2 text-[20px] font-semibold">
              Edit ad
              <Tip topic="layers" />
            </span>
            <span className="text-[13px] text-muted [overflow-wrap:anywhere]">{meta}</span>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="h-9 w-9 shrink-0 rounded-md border border-line-strong bg-white text-[18px] text-fg">
            ×
          </button>
        </div>
        <EditorPanel key={ad.id} ad={ad} close={close} />
      </div>
    </div>
  );
}
