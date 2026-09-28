"use client";

import { useEffect, useState } from "react";
import { AdTile } from "./ScaledAd";
import { api, errMsg, type ShareData } from "@/lib/client/api";
import { STAGE_NAME } from "@/lib/client/chat";
import { styleByKey } from "@/lib/styles";
import type { AdDTO } from "@/lib/api-types";

type Status = "approved" | "rejected";

function ReviewTile({ ad, token, initial }: { ad: AdDTO; token: string; initial?: { status: Status; comment?: string } }) {
  const [status, setStatus] = useState<Status | null>(initial?.status ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saved, setSaved] = useState(initial?.comment ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (next: Status) => {
    setBusy(true);
    setMsg("");
    try {
      await api.approve(token, { adId: ad.id, status: next, comment: comment.trim() || undefined });
      setStatus(next);
      setSaved(comment);
      setMsg(next === "approved" ? "Approved" : "Rejected");
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const fid = `c-${ad.id}`;
  return (
    <div className={`flex min-w-0 flex-col gap-3 rounded-lg border p-3 ${status === "approved" ? "border-fg" : "border-line"}`} data-testid="review-tile">
      <div className="overflow-hidden rounded-md border border-line">
        <AdTile ad={ad} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-semibold">
          {STAGE_NAME[ad.stage]} · {styleByKey(ad.style).name}
        </span>
        {ad.angle && <span className="truncate text-[12px] text-muted">Angle: {ad.angle}</span>}
      </div>
      <label htmlFor={fid} className="sr-only">
        Comment
      </label>
      <textarea id={fid} rows={2} placeholder="Add a comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} className="field resize-y" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={status === "approved"} disabled={busy} onClick={() => save("approved")} className={`btn min-w-0 ${status === "approved" ? "btn-primary" : ""}`}>
          {status === "approved" ? "Approved" : "Approve"}
        </button>
        <button type="button" aria-pressed={status === "rejected"} disabled={busy} onClick={() => save("rejected")} className={`btn min-w-0 ${status === "rejected" ? "btn-primary" : ""}`}>
          {status === "rejected" ? "Rejected" : "Reject"}
        </button>
      </div>
      {status && comment !== saved && <span className="text-[12px] text-muted">Tap Approve or Reject again to save your comment.</span>}
      {msg && (
        <span role="status" className="text-[12px] text-muted">
          {msg}
        </span>
      )}
    </div>
  );
}

export function ShareView({ token }: { token: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.getShare(token).then(
      (d) => live && setData(d),
      (e) => live && setError(errMsg(e)),
    );
    return () => {
      live = false;
    };
  }, [token]);

  const ads = (data?.ads ?? []).filter((a) => a.status === "ready" && !a.removed);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-fg">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-6 text-[16px] font-semibold max-[820px]:px-4">
        <span className="inline-block h-5 w-5 rounded bg-fg" aria-hidden="true" />
        <span>[App name]</span>
      </header>
      <main className="page-pad mx-auto box-border flex w-full max-w-[1200px] flex-col gap-8">
        {error ? (
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[24px] font-semibold">This link isn&apos;t working</h1>
            <p className="m-0 text-[14px] text-muted">{error}. Ask for a new link.</p>
          </div>
        ) : !data ? (
          <p className="m-0 text-[14px] text-muted">Loading ads...</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[32px] font-semibold [overflow-wrap:anywhere]">Review ads for {data.brand.name}</h1>
              <p className="m-0 text-[16px] text-muted">Approve or reject each ad. Add a comment if something should change.</p>
            </div>
            {ads.length === 0 ? (
              <p className="m-0 text-[14px] text-muted">No ads to review yet.</p>
            ) : (
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
                {ads.map((ad) => (
                  <ReviewTile key={ad.id} ad={ad} token={token} initial={data.approvals[ad.id]} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
