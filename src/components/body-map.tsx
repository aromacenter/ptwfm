import type { MuscleGroup } from "@prisma/client";

// Schematic front + back body map. Highlights primary muscles strongly and
// secondary muscles faintly. Our own SVG — no third-party anatomy art.

const PRIMARY = "#059669"; // emerald-600
const SECONDARY = "#6ee7b7"; // emerald-300
const IDLE = "rgba(120,120,120,0.14)";
const OUTLINE = "rgba(120,120,120,0.35)";

type Region = { view: "front" | "back"; shape: "ellipse" | "rect"; props: Record<string, number> };

// Each muscle maps to one or more drawn regions across the two figures.
const REGIONS: Record<string, Region[]> = {
  NECK: [{ view: "front", shape: "rect", props: { x: 66, y: 25, width: 8, height: 6, rx: 2 } }],
  SHOULDERS: [
    { view: "front", shape: "ellipse", props: { cx: 52, cy: 41, rx: 7, ry: 6 } },
    { view: "front", shape: "ellipse", props: { cx: 88, cy: 41, rx: 7, ry: 6 } },
  ],
  CHEST: [
    { view: "front", shape: "ellipse", props: { cx: 62, cy: 52, rx: 9, ry: 7 } },
    { view: "front", shape: "ellipse", props: { cx: 78, cy: 52, rx: 9, ry: 7 } },
  ],
  BICEPS: [
    { view: "front", shape: "ellipse", props: { cx: 46, cy: 60, rx: 5, ry: 10 } },
    { view: "front", shape: "ellipse", props: { cx: 94, cy: 60, rx: 5, ry: 10 } },
  ],
  FOREARMS: [
    { view: "front", shape: "ellipse", props: { cx: 40, cy: 82, rx: 4, ry: 11 } },
    { view: "front", shape: "ellipse", props: { cx: 100, cy: 82, rx: 4, ry: 11 } },
  ],
  ABS: [{ view: "front", shape: "rect", props: { x: 62, y: 62, width: 16, height: 26, rx: 3 } }],
  OBLIQUES: [
    { view: "front", shape: "ellipse", props: { cx: 57, cy: 76, rx: 3, ry: 11 } },
    { view: "front", shape: "ellipse", props: { cx: 83, cy: 76, rx: 3, ry: 11 } },
  ],
  ADDUCTORS: [{ view: "front", shape: "ellipse", props: { cx: 70, cy: 104, rx: 4, ry: 14 } }],
  QUADS: [
    { view: "front", shape: "ellipse", props: { cx: 62, cy: 114, rx: 7, ry: 22 } },
    { view: "front", shape: "ellipse", props: { cx: 78, cy: 114, rx: 7, ry: 22 } },
  ],
  TRAPS: [{ view: "back", shape: "ellipse", props: { cx: 170, cy: 38, rx: 13, ry: 7 } }],
  UPPER_BACK: [{ view: "back", shape: "rect", props: { x: 157, y: 46, width: 26, height: 16, rx: 3 } }],
  LATS: [
    { view: "back", shape: "ellipse", props: { cx: 157, cy: 68, rx: 6, ry: 12 } },
    { view: "back", shape: "ellipse", props: { cx: 183, cy: 68, rx: 6, ry: 12 } },
  ],
  TRICEPS: [
    { view: "back", shape: "ellipse", props: { cx: 145, cy: 60, rx: 5, ry: 11 } },
    { view: "back", shape: "ellipse", props: { cx: 195, cy: 60, rx: 5, ry: 11 } },
  ],
  LOWER_BACK: [{ view: "back", shape: "rect", props: { x: 162, y: 64, width: 16, height: 12, rx: 3 } }],
  GLUTES: [
    { view: "back", shape: "ellipse", props: { cx: 163, cy: 88, rx: 7, ry: 8 } },
    { view: "back", shape: "ellipse", props: { cx: 177, cy: 88, rx: 7, ry: 8 } },
  ],
  HAMSTRINGS: [
    { view: "back", shape: "ellipse", props: { cx: 164, cy: 116, rx: 6, ry: 20 } },
    { view: "back", shape: "ellipse", props: { cx: 176, cy: 116, rx: 6, ry: 20 } },
  ],
  CALVES: [
    { view: "front", shape: "ellipse", props: { cx: 63, cy: 152, rx: 5, ry: 15 } },
    { view: "front", shape: "ellipse", props: { cx: 77, cy: 152, rx: 5, ry: 15 } },
    { view: "back", shape: "ellipse", props: { cx: 164, cy: 154, rx: 5, ry: 15 } },
    { view: "back", shape: "ellipse", props: { cx: 176, cy: 154, rx: 5, ry: 15 } },
  ],
};

// Simple humanoid outline per figure (head, torso, limbs).
function Figure({ cx }: { cx: number }) {
  return (
    <g fill="none" stroke={OUTLINE} strokeWidth="1.5">
      <circle cx={cx} cy={18} r={9} />
      <path
        d={`M${cx - 14} 34 Q${cx} 30 ${cx + 14} 34 L${cx + 12} 96 L${cx + 8} 178 L${cx + 2} 178 L${cx} 100 L${cx - 2} 178 L${cx - 8} 178 L${cx - 12} 96 Z`}
      />
      <path d={`M${cx - 14} 35 L${cx - 22} 96`} />
      <path d={`M${cx + 14} 35 L${cx + 22} 96`} />
    </g>
  );
}

export function BodyMap({
  primary,
  secondary,
  className = "",
}: {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  className?: string;
}) {
  const fullBody = primary.includes("FULL_BODY") || secondary.includes("FULL_BODY");
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);

  const fillFor = (muscle: string): string => {
    if (fullBody) return primary.includes("FULL_BODY") ? PRIMARY : SECONDARY;
    if (primarySet.has(muscle as MuscleGroup)) return PRIMARY;
    if (secondarySet.has(muscle as MuscleGroup)) return SECONDARY;
    return IDLE;
  };

  const renderView = (view: "front" | "back") =>
    Object.entries(REGIONS).flatMap(([muscle, regions]) =>
      regions
        .filter((r) => r.view === view)
        .map((r, i) => {
          const fill = fillFor(muscle);
          const key = `${muscle}-${view}-${i}`;
          return r.shape === "ellipse" ? (
            <ellipse key={key} {...r.props} fill={fill} />
          ) : (
            <rect key={key} {...r.props} fill={fill} />
          );
        }),
    );

  return (
    <svg
      viewBox="0 0 240 195"
      className={className}
      role="img"
      aria-label="Muscles worked"
    >
      <Figure cx={70} />
      <Figure cx={170} />
      {renderView("front")}
      {renderView("back")}
    </svg>
  );
}
