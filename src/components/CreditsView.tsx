"use client";

import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Tip } from "./Tip";
import { api, errMsg, type CreditsData } from "@/lib/client/api";
import type { PlanDTO } from "@/lib/api-types";

const FALLBACK_PLANS: PlanDTO[] = [
  { name: "Starter", price: 39, credits: 100, perAd: "$0.39", videos: 10 },
  { name: "Growth", price: 99, credits: 300, perAd: "$0.33", videos: 30 },
  { name: "Agency", price: 299, credits: 1000, perAd: "$0.30", videos: 100 },
];
const TAGS: Record<string, string> = { starter: "Solo brands", growth: "Brands and small agencies", agency: "Many clients" };
const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function CreditsView() {
  const { state, dispatch, toast } = useApp();
  const [data, setData] = useState<CreditsData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.credits().then(
      (d) => {
        if (!live) return;
        setData(d);
        dispatch({ type: "credits", balance: d.balance });
      },
      (e) => live && toast(`Couldn't load credits: ${errMsg(e)}`),
    );
    return () => {
      live = false;
    };
  }, [dispatch, toast]);

  const plans = data?.plans?.length ? data.plans : FALLBACK_PLANS;
  const balance = data?.balance ?? state.credits;
  const current = data?.plan ?? state.account?.plan ?? null;
  const recommended = data?.recommendedPlan ?? state.account?.recommendedPlan ?? null;

  const topup = async (plan?: string) => {
    setBusy(plan ?? "topup");
    try {
      const r = await api.topup(plan);
      if (r.checkoutUrl) {
        window.location.href = r.checkoutUrl;
        return;
      }
      setData((d) => (d ? { ...d, balance: r.balance, plan: plan ?? d.plan } : d));
      dispatch({ type: "credits", balance: r.balance });
      toast(plan ? `Switched to ${plan}` : "Credits added");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="page-pad flex min-h-0 grow justify-center overflow-y-auto">
      <div className="flex w-full max-w-[1088px] flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="m-0 flex items-center gap-3 text-[32px] font-semibold">
              Credits
              <Tip topic="credits" />
            </h1>
            <p className="m-0 text-[16px] text-muted">Pay only for what you make. 1 image ad = 1 credit. Text edits are free.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[13px] text-muted">Balance</span>
              <span className="text-[20px] font-semibold" data-testid="balance">
                {balance} credits
              </span>
            </div>
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => topup()}>
              Top up
            </button>
          </div>
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
          {plans.map((p) => {
            const cur = same(current, p.name);
            const rec = !cur && same(recommended, p.name);
            return (
              <div key={p.name} className={`flex flex-col gap-5 rounded-lg border p-6 ${cur ? "border-fg" : "border-line"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold">{p.name}</span>
                  <span className={`text-[12px] ${rec ? "rounded-[10px] bg-fg px-2 py-[3px] font-semibold text-white" : "text-muted"}`}>
                    {cur ? "Current plan" : rec ? "Recommended for you" : (TAGS[p.name.toLowerCase()] ?? "")}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[40px] font-semibold">${p.price}</span>
                  <span className="text-[14px] text-muted">/ month</span>
                </div>
                <div className="flex flex-col gap-2 border-y border-line py-4 text-[14px]">
                  <span className="font-semibold">{p.credits.toLocaleString("en-US")} credits every month</span>
                  <span>{p.perAd} per image ad</span>
                  <span>Unlimited brands and team</span>
                </div>
                <button type="button" className={`btn ${cur ? "bg-subtle text-muted" : "btn-primary"}`} disabled={cur || !!busy} onClick={() => topup(p.name)}>
                  {cur ? "Current plan" : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg bg-subtle px-6 py-5 text-[14px]">
          <span>
            New accounts get <strong>20 free credits</strong>: one full Funnel Pack.
          </span>
          <span className="text-muted">Unused credits roll over while you&apos;re subscribed.</span>
        </div>
      </div>
    </main>
  );
}
