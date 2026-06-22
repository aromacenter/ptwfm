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

// Each goal: enum value, i18n label key, and an inline icon. One element in
// every icon carries a `gs-play …` animation class that only runs on hover or
// when the card is selected (and never under prefers-reduced-motion).
const GOALS: { value: Goal; key: string; icon: ReactNode }[] = [
  {
    value: "WEIGHT_LOSS",
    key: "weightLoss",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="16" width="18" height="4" rx="1.5" />
        <g className="gs-play gs-drop">
          <line x1="12" y1="4" x2="12" y2="13" />
          <polyline points="8 9 12 13 16 9" />
        </g>
      </svg>
    ),
  },
  {
    value: "MUSCLE_GAIN",
    key: "muscleGain",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="gs-play gs-bob">
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="6" y1="9" x2="6" y2="15" />
          <line x1="3.5" y1="10.5" x2="3.5" y2="13.5" />
          <line x1="18" y1="9" x2="18" y2="15" />
          <line x1="20.5" y1="10.5" x2="20.5" y2="13.5" />
        </g>
      </svg>
    ),
  },
  {
    value: "STRENGTH",
    key: "strength",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="gs-play gs-beat">
          <line x1="2" y1="12" x2="22" y2="12" />
          <rect x="4" y="8" width="2.6" height="8" rx="1" />
          <rect x="7.6" y="9.5" width="2" height="5" rx="1" />
          <rect x="17.4" y="8" width="2.6" height="8" rx="1" />
          <rect x="14.4" y="9.5" width="2" height="5" rx="1" />
        </g>
      </svg>
    ),
  },
  {
    value: "ENDURANCE",
    key: "endurance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline
          className="gs-play gs-dash"
          points="2 12 7 12 9.5 6 12.5 18 15 12 22 12"
        />
      </svg>
    ),
  },
  {
    value: "HEALTH",
    key: "health",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          className="gs-play gs-beat"
          d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"
        />
      </svg>
    ),
  },
  {
    value: "GENERAL",
    key: "general",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle className="gs-play gs-pulse" cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
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
        {GOALS.map(({ value: g, key, icon }) => {
          const selected = value === g;
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(g)}
              className={`gs-card group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                selected
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                  : "border-foreground/15 text-foreground/80 hover:border-foreground/40"
              }`}
            >
              <span className="h-8 w-8" aria-hidden>
                {icon}
              </span>
              <span className="text-xs font-medium leading-tight">
                {t(key)}
              </span>
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
@keyframes gsPulse { 0% { transform: scale(.55); opacity: .85; } 100% { transform: scale(1.05); opacity: 0; } }
@keyframes gsDash { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .gs-play { animation: none !important; }
}
`;
