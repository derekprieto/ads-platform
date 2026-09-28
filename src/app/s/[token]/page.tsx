import type { Metadata } from "next";
import { ShareView } from "@/components/ShareView";

export const metadata: Metadata = { title: "Review ads · [App name]", robots: { index: false } };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareView token={token} />;
}
