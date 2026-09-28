import type { Metadata } from "next";

export const metadata: Metadata = { title: "Results · [App name]" };

export default function ResultsPage() {
  return (
    <main className="page-pad box-border flex min-h-0 w-full max-w-[1440px] grow flex-col gap-8 self-center overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[32px] font-semibold">Results</h1>
        <p className="m-0 text-[16px] text-muted">Connect Meta to see which ads, angles and styles win.</p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-line px-6 py-12 text-center">
        <span className="text-[20px] font-semibold">Connect your Meta ad account</span>
        <span className="max-w-[440px] text-[14px] text-muted">Read only. We never change your ads. We match each ad to its parts so you know exactly what wins.</span>
        <button type="button" className="btn btn-primary" disabled>
          Connect Meta (coming in V2)
        </button>
      </div>
    </main>
  );
}
