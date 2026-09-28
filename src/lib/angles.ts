import type { BusinessType } from "./api-types";

export type AngleSeed = { name: string; line: string; tag: "Proven" | "Try this" | "" };

/** Generic angle library. The Offer Brain rewrites `line` for each brand. First 3 Proven + 2 Try this = default pick. */
export const ANGLE_LIBRARY: Record<BusinessType, AngleSeed[]> = {
  ecom: [
    { name: "Pain", line: "The problem they feel every day.", tag: "Proven" },
    { name: "Result", line: "The outcome they get, made specific.", tag: "Proven" },
    { name: "Us vs them", line: "Your product vs the usual fix.", tag: "Proven" },
    { name: "Enemy", line: "Blame the real villain, not the customer.", tag: "Try this" },
    { name: "Cost of waiting", line: "What every day without it costs them.", tag: "Try this" },
    { name: "Identity", line: "Who they are, or want to be.", tag: "" },
    { name: "Contrarian", line: "Say the opposite of the common advice.", tag: "" },
    { name: "Curiosity", line: "A trick or secret they haven't heard.", tag: "" },
    { name: "Founder story", line: "Why the founder built it.", tag: "" },
    { name: "Gift", line: "The perfect gift for someone they know.", tag: "" },
  ],
  saas: [
    { name: "Pain", line: "The daily headache the tool removes.", tag: "Proven" },
    { name: "Time saved", line: "Hours they get back, made specific.", tag: "Proven" },
    { name: "Us vs them", line: "Your tool vs spreadsheets or the old tool.", tag: "Proven" },
    { name: "Enemy", line: "The broken process everyone hates.", tag: "Try this" },
    { name: "Look good to the boss", line: "Make the buyer the hero at work.", tag: "Try this" },
    { name: "Identity", line: "For the person who holds it all together.", tag: "" },
    { name: "Contrarian", line: "Kill the thing everyone thinks they need.", tag: "" },
    { name: "Cost of waiting", line: "What the old way costs every week.", tag: "" },
    { name: "Curiosity", line: "The small change that fixed everything.", tag: "" },
    { name: "Founder story", line: "Why the founder built it.", tag: "" },
  ],
  services: [
    { name: "Pain", line: "What's broken in their business right now.", tag: "Proven" },
    { name: "Result", line: "The specific outcome in a set time.", tag: "Proven" },
    { name: "Risk reversal", line: "They don't pay unless it works.", tag: "Proven" },
    { name: "Enemy", line: "The bad alternative they're stuck with.", tag: "Try this" },
    { name: "Scarcity", line: "Limited spots or exclusivity.", tag: "Try this" },
    { name: "Us vs them", line: "You vs the usual option.", tag: "" },
    { name: "Contrarian", line: "Stop doing what everyone does.", tag: "" },
    { name: "Cost of waiting", line: "Money lost every empty day.", tag: "" },
    { name: "Identity", line: "For owners who want to run, not chase.", tag: "" },
    { name: "Founder story", line: "Why you only serve this niche.", tag: "" },
  ],
};

export const recommendedAngles = (names: { name: string; tag: string }[]) => {
  const proven = names.filter((a) => a.tag === "Proven").slice(0, 3);
  const tryThis = names.filter((a) => a.tag === "Try this").slice(0, 2);
  return [...proven, ...tryThis].map((a) => a.name);
};
