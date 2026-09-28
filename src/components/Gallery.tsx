"use client";

import { useState } from "react";
import { useApp } from "./AppProvider";
import { Tip } from "./Tip";
import { AdTile } from "./ScaledAd";
import { api, errMsg } from "@/lib/client/api";
import { brandAds, brandOf, isPending, STAGE_NAME, STAGES } from "@/lib/client/chat";
import { styleByKey } from "@/lib/styles";
import type { AdDTO } from "@/lib/api-types";

function Tile({ ad }: { ad: AdDTO }) {
  const { dispatch, setEditId, toast } = useApp();
  const pending = isPending(ad);
  const failed = ad.status === "failed";

  const toggle = async () => {
    const removed = !ad.removed;
    dispatch({ type: "adUpdated", ad: { ...ad, removed } });
    try {
      const r = await api.patchAd(ad.id, { removed });
      dispatch({ type: "adUpdated", ad: r.ad });
    } catch (e) {
      dispatch({ type: "adUpdated", ad });
      toast(errMsg(e));
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="ad-tile" data-status={ad.status}>
      <button
        type="button"
        aria-label={`Edit ${styleByKey(ad.style).name} ad`}
        disabled={pending || failed}
        onClick={() => setEditId(ad.id)}
        className={`block w-full overflow-hidden rounded-lg border border-line bg-white p-0 ${ad.removed ? "opacity-25" : ""}`}
      >
        <AdTile ad={ad} />
      </button>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[12px] text-fg">{styleByKey(ad.style).name}</span>
          <span className="truncate text-[12px] text-muted">{ad.angle ? `Angle: ${ad.angle}` : ""}</span>
        </div>
        {!failed && (
          <button type="button" className="btn btn-sm shrink-0" onClick={toggle} disabled={pending}>
            {ad.removed ? "Undo" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

export function Gallery() {
  const { state, dispatch, toast } = useApp();
  const [sharing, setSharing] = useState(false);
  const brand = brandOf(state);
  const ads = brandAds(state);
  const counts = { cold: 0, warm: 0, hot: 0 };
  ads.forEach((a) => counts[a.stage]++);
  const kept = ads.filter((a) => a.status === "ready" && !a.removed).length;
  const tabAds = ads.filter((a) => a.stage === state.tab);

  const download = () => {
    if (!brand || !kept) return toast("No ads yet");
    const a = document.createElement("a");
    a.href = api.downloadUrl(brand.id);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async () => {
    if (!brand || !ads.length) return toast("No ads yet");
    setSharing(true);
    try {
      const { url } = await api.share(brand.id);
      const full = new URL(url, window.location.origin).toString();
      try {
        await navigator.clipboard.writeText(full);
        toast("Approval link copied. Your client can approve or comment on each ad.");
      } catch {
        toast(`Approval link: ${full}`);
      }
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setSharing(false);
    }
  };

  return (
    <section aria-label="Gallery" className="galcol">
      <div className="gal-pad flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="m-0 flex items-center gap-2 text-[20px] font-semibold">
              Gallery
              <Tip topic="gallery" />
            </h2>
            <span className="text-[13px] text-muted [overflow-wrap:anywhere]">{brand ? `${brand.name} · ${ads.length} ads · click any ad to edit` : "No ads yet"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.mode === "agency" && (
              <button type="button" className="btn" onClick={share} disabled={sharing}>
                Share with client
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={download}>
              Download {kept} ads
            </button>
          </div>
        </div>
        <div role="tablist" aria-label="Funnel stage" className="flex flex-wrap gap-6 border-b border-line">
          {STAGES.map((st) => {
            const on = state.tab === st;
            return (
              <button
                key={st}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => dispatch({ type: "setTab", tab: st })}
                className={`h-11 border-0 border-b-2 border-solid bg-transparent p-0 text-[14px] ${on ? "border-fg font-semibold text-fg" : "border-transparent text-muted"}`}
              >
                {STAGE_NAME[st]} ({counts[st]})
              </button>
            );
          })}
          <span className="flex items-center">
            <Tip topic="funnel" />
          </span>
        </div>
      </div>
      <div className="gal-pad galscroll pb-6 pt-6" role="tabpanel">
        {ads.length === 0 ? (
          <div className="box-border flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-6 text-center">
            <span className="text-[16px] font-semibold">Your ads show up here</span>
            <span className="text-[14px] text-muted">Answer the assistant. It takes about 1 minute.</span>
          </div>
        ) : tabAds.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">No {STAGE_NAME[state.tab].toLowerCase()} ads yet.</p>
        ) : (
          <div className="grid gap-x-5 gap-y-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}>
            {tabAds.map((ad) => (
              <Tile key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
