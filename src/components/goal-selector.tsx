"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export type Goal =
  | "WEIGHT_LOSS"
  | "MUSCLE_GAIN"
  | "STRENGTH"
  | "ENDURANCE"
  | "HEALTH"
  | "GENERAL";

type GoalDef = {
  value: Goal;
  key: string;
  ring: string; // selected border/label colour
  tint: string; // selected background tint
  from: string; // gradient start
  to: string; // gradient end
  symbol: ReactNode; // white symbol drawn on the coloured disc
};

// White symbols are drawn on a coloured gradient disc (viewBox 0 0 48 48,
// disc centred at 24,24 r=22). One element per icon carries a `gs-play …`
// class so its animation only runs on hover / when selected.
const GOALS: GoalDef[] = [
  {
    value: "WEIGHT_LOSS",
    key: "weightLoss",
    ring: "#0891b2",
    tint: "rgba(8,145,178,0.10)",
    from: "#2dd4bf",
    to: "#0891b2",
    symbol: (
      <>
        <g className="gs-play gs-drop">
          <line x1="24" y1="14" x2="24" y2="28" />
          <polyline points="18 23 24 29 30 23" fill="none" />
        </g>
        <rect x="15" y="32" width="18" height="3.4" rx="1.7" stroke="none" fill="#fff" />
      </>
    ),
  },
  {
    value: "MUSCLE_GAIN",
    key: "muscleGain",
    ring: "#ea580c",
    tint: "rgba(249,115,22,0.10)",
    from: "#fbbf24",
    to: "#f97316",
    symbol: (
      <g className="gs-play gs-bob">
        <line x1="17" y1="24" x2="31" y2="24" />
        <line x1="16" y1="19" x2="16" y2="29" />
        <line x1="12.5" y1="21" x2="12.5" y2="27" />
        <line x1="32" y1="19" x2="32" y2="29" />
        <line x1="35.5" y1="21" x2="35.5" y2="27" />
      </g>
    ),
  },
  {
    value: "STRENGTH",
    key: "strength",
    ring: "#e11d48",
    tint: "rgba(225,29,72,0.10)",
    from: "#fb7185",
    to: "#e11d48",
    symbol: (
      <g className="gs-play gs-beat">
        <line x1="10" y1="24" x2="38" y2="24" />
        <rect x="13" y="18" width="3.4" height="12" rx="1.4" stroke="none" fill="#fff" />
        <rect x="18" y="20.5" width="2.6" height="7" rx="1.2" stroke="none" fill="#fff" />
        <rect x="31.6" y="18" width="3.4" height="12" rx="1.4" stroke="none" fill="#fff" />
        <rect x="27.4" y="20.5" width="2.6" height="7" rx="1.2" stroke="none" fill="#fff" />
      </g>
    ),
  },
  {
    value: "ENDURANCE",
    key: "endurance",
    ring: "#4f46e5",
    tint: "rgba(79,70,229,0.10)",
    from: "#38bdf8",
    to: "#4f46e5",
    symbol: (
      <polyline
        className="gs-play gs-dash"
        points="12 24 18 24 21 15 26 33 29 24 36 24"
        fill="none"
      />
    ),
  },
  {
    value: "HEALTH",
    key: "health",
    ring: "#db2777",
    tint: "rgba(219,39,119,0.10)",
    from: "#f472b6",
    to: "#db2777",
    symbol: (
      <path
        className="gs-play gs-beat"
        d="M24 33c-1.2-1-9-5.6-9-11.5a4.8 4.8 0 0 1 9-2.6 4.8 4.8 0 0 1 9 2.6C33 27.4 25.2 32 24 33z"
        stroke="none"
        fill="#fff"
      />
    ),
  },
  {
    value: "GENERAL",
    key: "general",
    ring: "#7c3aed",
    tint: "rgba(124,58,237,0.10)",
    from: "#a78bfa",
    to: "#7c3aed",
    symbol: (
      <>
        <circle className="gs-play gs-pulse" cx="24" cy="24" r="11" fill="none" />
        <circle cx="24" cy="24" r="7" fill="none" />
        <circle cx="24" cy="24" r="2.6" stroke="none" fill="#fff" />
      </>
    ),
  },
];

export function GoalSelector({
  value,
  onChange,
}: {
  value: Goal | null;
  onChange: (g: Goal) => void;
}) {
  const t = useTranslations("goals");

  return (
    <div className="space-y-2">
      <style>{GS_STYLE}</style>
      <p className="text-sm">{t("title")}</p>
      <div
        role="radiogroup"
        aria-label={t("title")}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      >
        {GOALS.map((g) => {
          const selected = value === g.value;
          const gradId = `gs-grad-${g.key}`;
          return (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(g.value)}
              style={
                selected
                  ? { borderColor: g.ring, backgroundColor: g.tint, color: g.ring }
                  : undefined
              }
              className={`gs-card group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                selected
                  ? ""
                  : "border-foreground/15 text-foreground/80 hover:border-foreground/40"
              }`}
            >
              <svg
                viewBox="0 0 48 48"
                className="h-11 w-11"
                aria-hidden
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={g.from} />
                    <stop offset="1" stopColor={g.to} />
                  </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="22" fill={`url(#${gradId})`} stroke="none" />
                {g.symbol}
              </svg>
              <span className="text-xs font-medium leading-tight">{t(g.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GS_STYLE = `
.gs-card .gs-play { animation-play-state: paused; transform-box: fill-box; transform-origin: center; }
.gs-card:hover .gs-play,
.gs-card[aria-checked="true"] .gs-play { animation-play-state: running; }
.gs-drop { animation: gsDrop 1.1s ease-in-out infinite; }
.gs-bob { animation: gsBob 1.1s ease-in-out infinite; }
.gs-beat { animation: gsBeat 1s ease-in-out infinite; }
.gs-pulse { animation: gsPulse 1.7s ease-out infinite; }
.gs-dash { stroke-dasharray: 64; stroke-dashoffset: 64; animation: gsDash 1.4s linear infinite; }
@keyframes gsDrop { 0%,100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }
@keyframes gsBob { 0%,100% { transform: translateY(2px); } 50% { transform: translateY(-3px); } }
@keyframes gsBeat { 0%,100% { transform: scale(1); } 22% { transform: scale(1.16); } 40% { transform: scale(1); } }
@keyframes gsPulse { 0% { transform: scale(.5); opacity: .9; } 100% { transform: scale(1.15); opacity: 0; } }
@keyframes gsDash { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .gs-play { animation: none !important; }
}
`;
