"use client";

import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Tip } from "./Tip";
import { AdTile } from "./ScaledAd";
import { isPending, liveAnglesId, optsVisible, TYPE_NAME, type Card, type Msg } from "@/lib/client/chat";
import type { AdDTO, AdStatus } from "@/lib/api-types";

const READ_STEPS = ["Reading your website", "Finding the offer and price", "Finding who buys it and why", "Pulling real reviews"];

function Bar({ pct, indeterminate }: { pct: number; indeterminate?: boolean }) {
  return (
    <div className="h-1 overflow-hidden rounded-sm bg-[#EDEDED]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(pct)}>
      <div className={`h-full bg-fg ${indeterminate ? "bar-indet" : "transition-[width] duration-300"}`} style={indeterminate ? undefined : { width: `${pct}%` }} />
    </div>
  );
}

function ReadingCard({ card }: { card: Extract<Card, { kind: "reading" }> }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (card.done) return;
    const t = setInterval(() => setI((n) => Math.min(n + 1, READ_STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [card.done]);
  return (
    <div className="flex flex-col gap-[10px] rounded-lg border border-line p-4">
      <span className="text-[14px] font-semibold">Learning your offer</span>
      <Bar pct={card.done ? 100 : 0} indeterminate={!card.done} />
      <span className="text-[13px] text-muted">{card.failed ? "Couldn't read that site" : card.done ? "Done" : READ_STEPS[i]}</span>
    </div>
  );
}

const PHASE: Partial<Record<AdStatus, string>> = {
  queued: "Writing hooks from your offer",
  briefing: "Writing hooks from your offer",
  generating: "Generating images (4 versions each)",
  judging: "Picking the best version of each",
  splitting: "Making text editable",
  rendering: "Making text editable",
};

function PackCard({ title, ads }: { title: string; ads: AdDTO[] }) {
  const done = ads.filter((a) => !isPending(a)).length;
  const n = ads.length || 1;
  const pct = Math.max(4, (done / n) * 100);
  const pending = ads.filter(isPending);
  const order: AdStatus[] = ["queued", "briefing", "generating", "judging", "splitting", "rendering"];
  const phase = pending.length ? PHASE[order[Math.min(...pending.map((a) => order.indexOf(a.status)).filter((x) => x >= 0), 5)]] : "Done";
  return (
    <div className="flex flex-col gap-[10px] rounded-lg border border-line p-4">
      <span className="text-[14px] font-semibold">{title}</span>
      <Bar pct={pending.length ? pct : 100} />
      <span className="text-[13px] text-muted">
        {phase}
        {pending.length ? ` · ${done} of ${ads.length} done` : ""}
      </span>
    </div>
  );
}

function OfferCard({ card }: { card: Extract<Card, { kind: "offer" }> }) {
  const o = card.brand.offer;
  const fields = [
    ["What you sell", o.sell],
    ["The offer", o.offer],
    ["Who buys it", o.who],
    ["Top pains", o.pains.join(", ")],
  ];
  const formula = [
    ["Number outcome", o.formula.number],
    ["Guarantee", o.formula.guarantee],
    ["Urgency", o.formula.urgency],
    ["End result", o.formula.result],
  ];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold">
          <span className="truncate">{card.brand.name}</span>
          <Tip topic="offer" />
        </span>
        <span className="rounded-xl border border-line-strong px-2 py-1 text-[12px]">{TYPE_NAME[card.brand.type]}</span>
      </div>
      {fields.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-[2px]">
          <span className="text-[12px] text-muted">{label}</span>
          <span className="text-[14px] leading-[1.4] [overflow-wrap:anywhere]">{value || "-"}</span>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          Hot ad formula
          <Tip topic="formula" />
        </span>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
          {formula.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-[2px] rounded-md bg-subtle px-[10px] py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
              <span className="text-[13px] leading-[1.35] [overflow-wrap:anywhere]">{value || "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnglesCard({ names, live }: { names: string[]; live: boolean }) {
  const { state, dispatch } = useApp();
  const byName = new Map(state.angles.map((a) => [a.name, a]));
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line p-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line px-2 pb-2 pt-1 text-[12px] text-muted">
        <span>
          <strong className="text-fg">Proven</strong>: works for most brands like yours
        </span>
        <span>
          <strong className="text-fg">Try this</strong>: rarely used by competitors
        </span>
      </div>
      {names.map((name) => {
        const a = byName.get(name) ?? { name, line: "", tag: "" as const };
        const on = state.angleSel.includes(name);
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            disabled={!live}
            onClick={() => dispatch({ type: "toggleAngle", name })}
            className={`flex w-full items-center gap-3 rounded-md border-0 px-2 py-[10px] text-left text-fg ${on && live ? "bg-[#F4F4F4]" : "bg-white"} ${live || on ? "" : "opacity-50"}`}
          >
            <span className={`box-border flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] ${on ? "bg-fg text-white" : "border border-[#BDBDBD]"}`} aria-hidden="true">
              {on ? "✓" : ""}
            </span>
            <span className="flex min-w-0 grow flex-col gap-[2px]">
              <span className="text-[14px] font-semibold [overflow-wrap:anywhere]">{a.name}</span>
              {a.line && <span className="text-[13px] leading-[1.35] text-muted">{a.line}</span>}
            </span>
            {a.tag && (
              <span className={`shrink-0 rounded-[10px] px-2 py-[3px] text-[11px] font-semibold ${a.tag === "Try this" ? "bg-fg text-white" : "border border-line-strong text-[#404040]"}`}>{a.tag}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AiMsg({ m }: { m: Msg }) {
  const { state, dispatch, setEditId } = useApp();
  const card = m.card;
  const live = liveAnglesId(state) === m.id;
  return (
    <div className="flex items-start gap-3" data-testid="ai-msg">
      <span className="h-7 w-7 shrink-0 rounded-md bg-fg" aria-hidden="true" />
      <div className="flex min-w-0 grow flex-col gap-3">
        <div className="flex items-start gap-2">
          <span className="min-w-0 whitespace-pre-line text-[15px] leading-[1.5] [overflow-wrap:anywhere]">{m.text}</span>
          {m.tip && (
            <span className="shrink-0 pt-[2px]">
              <Tip topic={m.tip} />
            </span>
          )}
        </div>
        {card?.kind === "offer" && <OfferCard card={card} />}
        {card?.kind === "reading" && <ReadingCard card={card} />}
        {card?.kind === "pack" && <PackCard title={card.title} ads={state.ads.filter((a) => a.packId === card.packId)} />}
        {card?.kind === "angles" && <AnglesCard names={card.names} live={live} />}
        {card?.kind === "ads" && (
          <div className="flex flex-wrap gap-2">
            {card.adIds
              .map((id) => state.ads.find((a) => a.id === id))
              .filter((a): a is AdDTO => !!a)
              .map((ad) => (
                <button key={ad.id} type="button" aria-label="Edit ad" onClick={() => setEditId(ad.id)} className="w-[108px] shrink-0 overflow-hidden rounded-md border border-line bg-white p-0">
                  <AdTile ad={ad} width={106} />
                </button>
              ))}
          </div>
        )}
        {optsVisible(state, m) && (
          <div className="flex flex-wrap gap-2">
            {m.opts!.map((o) => (
              <button key={o.label} type="button" className="chip" onClick={() => dispatch({ type: "pick", opt: o })}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Chat() {
  const { state, dispatch, loadError, reload } = useApp();
  const [draft, setDraft] = useState("");
  const hint =
    state.await === "angle"
      ? 'Type your own angle, e.g. "jealous of friends who sleep well"'
      : state.await === "url"
        ? "Paste website URL, e.g. yourbrand.com"
        : state.await === "change"
          ? "What should I change?"
          : 'Ask for anything, e.g. "make them funnier"';

  const send = () => {
    if (!draft.trim() || state.busy) return;
    dispatch({ type: "send", text: draft });
    setDraft("");
  };

  return (
    <section aria-label="Assistant" className="chatcol">
      <div className="flex min-h-0 grow flex-col-reverse overflow-y-auto">
        <div className="flex flex-col gap-5 px-5 py-6" aria-live="polite">
          {!state.loaded && !loadError && <span className="text-[14px] text-muted">Loading...</span>}
          {loadError && (
            <div className="flex flex-col items-start gap-3">
              <span className="text-[14px] text-error">Couldn&apos;t load your account: {loadError}</span>
              <button type="button" className="btn" onClick={reload}>
                Try again
              </button>
            </div>
          )}
          {state.msgs.map((m) =>
            m.from === "ai" ? (
              <AiMsg key={m.id} m={m} />
            ) : (
              <div key={m.id} className="flex justify-end" data-testid="me-msg">
                <span className="max-w-[80%] rounded-xl bg-[#F0F0F0] px-[14px] py-[10px] text-[15px] leading-[1.4] [overflow-wrap:anywhere]">{m.text}</span>
              </div>
            ),
          )}
          {state.busy && (
            <div className="flex items-center gap-3" aria-label="Assistant is typing">
              <span className="h-7 w-7 shrink-0 rounded-md bg-fg" aria-hidden="true" />
              <span className="animate-pulse text-[15px] text-muted">...</span>
            </div>
          )}
        </div>
      </div>
      <form
        className="flex items-center gap-2 border-t border-line px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          aria-label="Message the assistant"
          size={1}
          placeholder={hint}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="box-border h-11 min-w-0 grow rounded-[22px] border border-line-strong px-[14px] text-[15px] text-fg"
        />
        <button type="submit" disabled={!draft.trim() || state.busy} className="h-11 shrink-0 rounded-[22px] border-0 bg-fg px-5 text-[14px] font-semibold text-white disabled:bg-[#A3A3A3]">
          Send
        </button>
      </form>
    </section>
  );
}
