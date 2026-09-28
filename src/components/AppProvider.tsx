"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errMsg } from "@/lib/client/api";
import { brandAds, initialState, isPending, step, type ChatEvent, type ChatState, type Effect } from "@/lib/client/chat";

const LAST_BRAND_KEY = "lastBrandId";
function readLastBrand(): string | null {
  try { return localStorage.getItem(LAST_BRAND_KEY); } catch { return null; }
}

type AppCtx = {
  state: ChatState;
  dispatch: (e: ChatEvent) => void;
  toast: (msg: string) => void;
  loadError: string | null;
  reload: () => void;
  editId: string | null;
  setEditId: (id: string | null) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<ChatState>(initialState);
  const ref = useRef(state);
  const runRef = useRef<(f: Effect) => void>(() => {});
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pollErr, setPollErr] = useState(0);

  const dispatch = useCallback((e: ChatEvent) => {
    const r = step(ref.current, e);
    ref.current = r.state;
    setState(r.state);
    r.effects.forEach((f) => runRef.current(f));
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  useEffect(() => {
    const fail = (e: unknown, retry?: "url") => dispatch({ type: "failed", message: errMsg(e), retry });
    runRef.current = (f: Effect) => {
      switch (f.type) {
        case "onboarding":
          api.onboarding(f.body).then((r) => dispatch({ type: "onboarded", account: r.account }), (e) => fail(e));
          break;
        case "readBrand":
          api.readBrand(f.url).then((r) => dispatch({ type: "brandRead", brand: r.brand }), (e) => fail(e, "url"));
          break;
        case "patchBrand":
          api.patchBrand(f.brandId, { note: f.note }).then((r) => dispatch({ type: "brandPatched", brand: r.brand }), (e) => fail(e));
          break;
        case "loadAngles":
          api.angles(f.brandId).then((r) => dispatch({ type: "anglesLoaded", angles: r.angles, recommended: r.recommended, all: f.all }), (e) => fail(e));
          break;
        case "addAngle":
          api.addAngle(f.brandId, f.name).then((r) => dispatch({ type: "angleAdded", angle: r.angle }), (e) => fail(e));
          break;
        case "createPack":
          api.createPack(f.body).then(
            (r) => dispatch({ type: "packStarted", packId: r.packId, ads: r.ads, intro: f.intro }),
            (e) => {
              const ins = e instanceof ApiError ? e.insufficient : null;
              if (ins) dispatch({ type: "insufficient", ...ins });
              else fail(e);
            },
          );
          break;
        case "loadAds":
          api.ads(f.brandId).then((r) => dispatch({ type: "adsLoaded", brandId: f.brandId, ads: r.ads }), () => setPollErr((n) => n + 1));
          break;
        case "download": {
          const a = document.createElement("a");
          a.href = api.downloadUrl(f.brandId);
          a.download = "";
          document.body.appendChild(a);
          a.click();
          a.remove();
          break;
        }
        case "refreshCredits":
          api.credits().then((r) => dispatch({ type: "credits", balance: r.balance }), () => {});
          break;
        case "goCredits":
          router.push("/credits");
          break;
      }
    };
  }, [dispatch, router]);

  const reload = useCallback(() => {
    setLoadError(null);
    api.me().then(
      (r) => dispatch({ type: "loaded", account: r.account, credits: r.credits, brands: r.brands, lastBrandId: readLastBrand() }),
      (e) => setLoadError(errMsg(e)),
    );
  }, [dispatch]);

  useEffect(() => {
    if (ref.current.loaded) return;
    let live = true;
    api.me().then(
      (r) => live && dispatch({ type: "loaded", account: r.account, credits: r.credits, brands: r.brands, lastBrandId: readLastBrand() }),
      (e) => live && setLoadError(errMsg(e)),
    );
    return () => {
      live = false;
    };
  }, [dispatch]);

  // Poll the current brand's ads every 1500ms while any is still being made.
  const brandId = state.brandId;
  useEffect(() => {
    if (!brandId) return;
    try { localStorage.setItem(LAST_BRAND_KEY, brandId); } catch { /* storage blocked: fine */ }
  }, [brandId]);
  const pending = brandAds(state).some(isPending);
  useEffect(() => {
    if (!brandId || !pending) return;
    const t = setTimeout(() => runRef.current({ type: "loadAds", brandId }), 1500);
    return () => clearTimeout(t);
  }, [brandId, pending, state.ads, pollErr]);

  const value = useMemo(() => ({ state, dispatch, toast, loadError, reload, editId, setEditId }), [state, dispatch, toast, loadError, reload, editId]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && (
        <div role="status" className="fixed bottom-8 left-1/2 z-[1100] box-border max-w-[calc(100%-32px)] -translate-x-1/2 rounded-md bg-fg px-5 py-3 text-center text-[14px] text-white">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
