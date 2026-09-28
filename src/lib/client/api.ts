/** Typed fetch helpers for the API contract in src/lib/api-types.ts. */
import type { AccountDTO, AdDTO, AngleDTO, BrandDTO, PlanDTO } from "@/lib/api-types";
import type { Clients, PackBody } from "./chat";

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : `request failed (${status})`);
    this.status = status;
    this.body = body;
  }
  get insufficient() {
    return this.status === 402 ? { needed: Number(this.body.needed ?? 0), balance: Number(this.body.balance ?? 0) } : null;
  }
}

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    // keepalive: the request finishes even if the user closes the page right after an edit.
    keepalive: method !== "GET",
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

const enc = encodeURIComponent;

export type ShareData = { brand: { name: string }; ads: AdDTO[]; approvals: Record<string, { status: "approved" | "rejected"; comment?: string }> };
export type CreditsData = { balance: number; plan: string; recommendedPlan: string | null; plans: PlanDTO[] };

export const api = {
  me: () => req<{ account: AccountDTO; credits: number; brands: BrandDTO[] }>("/api/me"),
  onboarding: (body: { type: "brand" | "agency"; clients?: Clients }) => req<{ account: AccountDTO }>("/api/onboarding", "POST", body),
  readBrand: (url: string) => req<{ brand: BrandDTO }>("/api/brands/read", "POST", { url }),
  patchBrand: (id: string, body: { note?: string; name?: string }) => req<{ brand: BrandDTO }>(`/api/brands/${enc(id)}`, "PATCH", body),
  angles: (id: string) => req<{ angles: AngleDTO[]; recommended: string[] }>(`/api/brands/${enc(id)}/angles`),
  addAngle: (id: string, name: string) => req<{ angle: AngleDTO }>(`/api/brands/${enc(id)}/angles`, "POST", { name }),
  createPack: (body: PackBody) => req<{ packId: string; ads: AdDTO[] }>("/api/packs", "POST", body),
  ads: (brandId: string) => req<{ ads: AdDTO[] }>(`/api/brands/${enc(brandId)}/ads`),
  patchAd: (id: string, body: { removed?: boolean; layers?: { id: string; text: string }[] }) => req<{ ad: AdDTO }>(`/api/ads/${enc(id)}`, "PATCH", body),
  artEdit: (id: string, text: string) => req<{ ad: AdDTO }>(`/api/ads/${enc(id)}/art-edit`, "POST", { text }),
  undo: (id: string) => req<{ ad: AdDTO }>(`/api/ads/${enc(id)}/undo`, "POST"),
  headline: (id: string) => req<{ ad: AdDTO }>(`/api/ads/${enc(id)}/headline`, "POST"),
  more: (id: string) => req<{ ads: AdDTO[] }>(`/api/ads/${enc(id)}/more`, "POST"),
  downloadUrl: (brandId: string) => `/api/brands/${enc(brandId)}/download`,
  share: (brandId: string) => req<{ url: string }>(`/api/brands/${enc(brandId)}/share`, "POST"),
  getShare: (token: string) => req<ShareData>(`/api/share/${enc(token)}`),
  approve: (token: string, body: { adId: string; status: "approved" | "rejected"; comment?: string }) => req<{ ok: true }>(`/api/share/${enc(token)}`, "POST", body),
  credits: () => req<CreditsData>("/api/credits"),
  topup: (plan?: string) => req<{ balance: number; checkoutUrl?: string }>("/api/credits/topup", "POST", plan ? { plan } : {}),
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "something went wrong");
