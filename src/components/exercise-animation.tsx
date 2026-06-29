import type { ExerciseCategory } from "@prisma/client";

// Original animated exercise illustrations. A side-view articulated stick
// figure cycles through a movement's phases as a CSS "flipbook" (no third-party
// media). Each pattern defines a start (a) and end (b) pose; the mid pose is
// interpolated, and frames loop a→mid→b→mid for a smooth pendulum.

type P = [number, number];
type Pose = {
  head: P;
  shoulder: P;
  elbow: P;
  hand: P;
  hip: P;
  knee: P;
  ankle: P;
  toe: P;
};

const mid = (a: Pose, b: Pose): Pose => {
  const m = (p: P, q: P): P => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  return {
    head: m(a.head, b.head),
    shoulder: m(a.shoulder, b.shoulder),
    elbow: m(a.elbow, b.elbow),
    hand: m(a.hand, b.hand),
    hip: m(a.hip, b.hip),
    knee: m(a.knee, b.knee),
    ankle: m(a.ankle, b.ankle),
    toe: m(a.toe, b.toe),
  };
};

const STAND: Pose = {
  head: [60, 20],
  shoulder: [60, 38],
  elbow: [60, 56],
  hand: [60, 72],
  hip: [60, 74],
  knee: [60, 100],
  ankle: [60, 124],
  toe: [72, 124],
};

// Each pattern: [start, end] poses.
const PATTERNS: Record<string, [Pose, Pose]> = {
  SQUAT: [
    { ...STAND, elbow: [50, 40], hand: [62, 30] },
    { head: [60, 46], shoulder: [60, 62], elbow: [50, 64], hand: [62, 54], hip: [58, 90], knee: [48, 104], ankle: [60, 124], toe: [72, 124] },
  ],
  HINGE: [
    STAND,
    { head: [92, 44], shoulder: [80, 52], elbow: [78, 70], hand: [76, 88], hip: [54, 76], knee: [56, 100], ankle: [60, 124], toe: [72, 124] },
  ],
  PRESS: [
    { ...STAND, elbow: [48, 40], hand: [58, 28] },
    { ...STAND, elbow: [58, 22], hand: [60, 6] },
  ],
  RAISE: [
    STAND,
    { ...STAND, elbow: [70, 44], hand: [80, 40] },
  ],
  CURL: [
    STAND,
    { ...STAND, hand: [54, 38] },
  ],
  PULL: [
    { ...STAND, head: [60, 22], shoulder: [60, 40], elbow: [54, 24], hand: [58, 8], hip: [60, 76] },
    { ...STAND, head: [60, 22], shoulder: [60, 40], elbow: [50, 52], hand: [58, 40], hip: [60, 76] },
  ],
  ROW: [
    { head: [92, 44], shoulder: [80, 52], elbow: [80, 72], hand: [80, 90], hip: [54, 76], knee: [56, 100], ankle: [60, 124], toe: [72, 124] },
    { head: [92, 44], shoulder: [80, 52], elbow: [88, 56], hand: [80, 60], hip: [54, 76], knee: [56, 100], ankle: [60, 124], toe: [72, 124] },
  ],
  PUSHUP: [
    { head: [100, 86], shoulder: [88, 86], elbow: [88, 97], hand: [88, 108], hip: [40, 86], knee: [28, 92], ankle: [14, 102], toe: [6, 106] },
    { head: [100, 94], shoulder: [88, 94], elbow: [80, 101], hand: [88, 108], hip: [40, 94], knee: [28, 99], ankle: [14, 106], toe: [6, 110] },
  ],
  CORE: [
    { head: [100, 90], shoulder: [88, 90], elbow: [88, 104], hand: [80, 104], hip: [40, 90], knee: [26, 96], ankle: [12, 104], toe: [4, 107] },
    { head: [100, 86], shoulder: [88, 86], elbow: [88, 104], hand: [80, 104], hip: [40, 82], knee: [26, 92], ankle: [12, 104], toe: [4, 107] },
  ],
  CALF: [
    STAND,
    { head: [60, 14], shoulder: [60, 32], elbow: [60, 50], hand: [60, 66], hip: [60, 68], knee: [60, 94], ankle: [60, 118], toe: [72, 124] },
  ],
  JUMP: [
    STAND,
    { head: [60, 16], shoulder: [60, 34], elbow: [58, 20], hand: [60, 6], hip: [60, 70], knee: [60, 96], ankle: [60, 120], toe: [72, 124] },
  ],
};

const SLUG_PATTERN: Record<string, keyof typeof PATTERNS> = {
  "back-squat": "SQUAT",
  "front-squat": "SQUAT",
  "goblet-squat": "SQUAT",
  "leg-press": "SQUAT",
  "walking-lunge": "SQUAT",
  "bulgarian-split-squat": "SQUAT",
  "leg-extension": "SQUAT",
  "hip-thrust": "HINGE",
  deadlift: "HINGE",
  "romanian-deadlift": "HINGE",
  "kettlebell-swing": "HINGE",
  "back-extension": "HINGE",
  "leg-curl": "HINGE",
  "overhead-press": "PRESS",
  "dumbbell-shoulder-press": "PRESS",
  "lateral-raise": "RAISE",
  "face-pull": "PULL",
  "pull-up": "PULL",
  "lat-pulldown": "PULL",
  "bent-over-barbell-row": "ROW",
  "seated-cable-row": "ROW",
  "dumbbell-row": "ROW",
  "barbell-biceps-curl": "CURL",
  "dumbbell-hammer-curl": "CURL",
  "triceps-pushdown": "CURL",
  "dumbbell-shrug": "RAISE",
  "push-up": "PUSHUP",
  "barbell-bench-press": "PUSHUP",
  "dumbbell-bench-press": "PUSHUP",
  "incline-dumbbell-press": "PUSHUP",
  dips: "PUSHUP",
  plank: "CORE",
  "hanging-leg-raise": "CORE",
  "cable-crunch": "CORE",
  "russian-twist": "CORE",
  "standing-calf-raise": "CALF",
  burpee: "JUMP",
  "mountain-climber": "JUMP",
};

const CATEGORY_FALLBACK: Record<ExerciseCategory, keyof typeof PATTERNS> = {
  PUSH: "PRESS",
  PULL: "PULL",
  LEGS: "SQUAT",
  CORE: "CORE",
  CARDIO: "JUMP",
  FULL_BODY: "HINGE",
  MOBILITY: "CORE",
};

function patternFor(slug: string, category: ExerciseCategory): [Pose, Pose] {
  const key = SLUG_PATTERN[slug] ?? CATEGORY_FALLBACK[category];
  return PATTERNS[key];
}

function Figure({ pose }: { pose: Pose }) {
  const L = (a: P, b: P, key: string) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
  );
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={pose.head[0]} cy={pose.head[1]} r={8} />
      {L(pose.shoulder, pose.hip, "torso")}
      {L(pose.shoulder, pose.elbow, "uarm")}
      {L(pose.elbow, pose.hand, "farm")}
      {L(pose.hip, pose.knee, "thigh")}
      {L(pose.knee, pose.ankle, "shin")}
      {L(pose.ankle, pose.toe, "foot")}
    </g>
  );
}

export function ExerciseAnimation({
  slug,
  category,
  className = "",
}: {
  slug: string;
  category: ExerciseCategory;
  className?: string;
}) {
  const [a, b] = patternFor(slug, category);
  const m = mid(a, b);
  const frames = [a, m, b, m]; // pendulum loop

  return (
    <svg
      viewBox="0 0 120 132"
      className={className}
      role="img"
      aria-label="Exercise movement animation"
    >
      <style>{ANIM_CSS}</style>
      <line
        x1="8"
        y1="128"
        x2="112"
        y2="128"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      <g className="exfig">
        {frames.map((pose, i) => (
          <g key={i} className="exframe" style={{ animationDelay: `${i * 0.45}s` }}>
            <Figure pose={pose} />
          </g>
        ))}
      </g>
    </svg>
  );
}

const ANIM_CSS = `
.exframe { opacity: 0; animation: exFlip 1.8s steps(1, end) infinite; }
.exframe:first-child { opacity: 1; }
@keyframes exFlip { 0%, 25% { opacity: 1; } 25.01%, 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .exframe { animation: none; opacity: 0; }
  .exframe:first-child { opacity: 1; }
}
`;
