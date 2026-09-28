"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { brandOf, TYPE_NAME } from "@/lib/client/chat";

const NAV = [
  { label: "Create", href: "/" },
  { label: "Results", href: "/results" },
];

export function Header() {
  const { state, dispatch, toast } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const brand = brandOf(state);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const goCreate = () => {
    setMenu(false);
    if (path !== "/") router.push("/");
  };

  return (
    <header className="hdr">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[16px] font-semibold text-fg no-underline">
        <span className="inline-block h-5 w-5 rounded bg-fg" aria-hidden="true" />
        <span className="hdr-logo-text">[App name]</span>
      </Link>
      {state.mode === "agency" && (
        <div ref={menuRef} className="relative min-w-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Client: ${brand ? brand.name : "none picked"}`}
            onClick={() => setMenu(!menu)}
            className="flex h-9 min-w-[96px] max-w-[180px] items-center gap-2 rounded-md border border-line-strong bg-white px-3 text-[14px] text-fg"
          >
            <span className="truncate">{brand ? brand.name : "Pick a client"}</span>
            <span className="shrink-0 text-muted" aria-hidden="true">▾</span>
          </button>
          {menu && (
            <div role="menu" className="absolute left-0 top-11 z-50 box-border flex w-[260px] max-w-[calc(100vw-32px)] flex-col gap-[2px] rounded-lg border border-line bg-white p-2">
              <span className="px-2 py-[6px] text-[12px] text-muted">Clients</span>
              {state.brands.map((b) => (
                <button
                  key={b.id}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    goCreate();
                    if (b.id !== state.brandId) dispatch({ type: "switchBrand", brandId: b.id });
                  }}
                  className="flex h-10 items-center justify-between gap-2 rounded-md border-0 bg-white px-2 text-left text-[14px] text-fg hover:bg-subtle"
                >
                  <span className="truncate">{b.name}</span>
                  <span className="shrink-0 text-[12px] text-muted">{TYPE_NAME[b.type]}</span>
                </button>
              ))}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  goCreate();
                  dispatch({ type: "newClient" });
                }}
                className="h-10 border-0 border-t border-solid border-line bg-white px-2 text-left text-[14px] text-fg hover:bg-subtle"
              >
                + New client
              </button>
            </div>
          )}
        </div>
      )}
      <nav className="hdr-nav" aria-label="Main">
        {NAV.map((n) => {
          const on = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`box-border flex h-full items-center border-b-2 text-[14px] no-underline ${on ? "border-fg font-semibold text-fg" : "border-transparent text-muted"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="hdr-spacer" />
      <Link
        href="/credits"
        aria-label={`${state.credits} credits`}
        className="hdr-right flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border border-line bg-white px-3 text-[14px] text-fg no-underline"
      >
        {state.credits}
        <span className="hide-sm">&nbsp;credits</span>
      </Link>
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => toast("Account, team and settings are coming soon")}
        className="h-8 w-8 shrink-0 rounded-full border border-line-strong bg-subtle text-[13px] font-semibold text-fg"
      >
        A
      </button>
    </header>
  );
}
