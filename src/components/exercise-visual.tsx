import type { ExerciseCategory } from "@prisma/client";
import imagesMap from "@/lib/exercises/images.generated.json";
import { ExerciseAnimation } from "@/components/exercise-animation";

const MAP = imagesMap as Record<string, string[]>;

// Shows a lifelike two-phase photo loop (start ↔ end pose, cross-faded) when we
// have public-domain images for the exercise; otherwise falls back to our own
// SVG movement animation. Respects prefers-reduced-motion.
export function ExerciseVisual({
  slug,
  category,
  alt,
  className = "",
}: {
  slug: string;
  category: ExerciseCategory;
  alt?: string;
  className?: string;
}) {
  const imgs = MAP[slug];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <style>{PHOTO_CSS}</style>
      {imgs && imgs.length >= 2 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgs[0]} alt={alt ?? ""} loading="lazy" className="exv-img" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgs[1]} alt="" aria-hidden="true" loading="lazy" className="exv-img exv-top" />
        </>
      ) : (
        <ExerciseAnimation
          slug={slug}
          category={category}
          className="h-full w-full text-emerald-600"
        />
      )}
    </div>
  );
}

const PHOTO_CSS = `
.exv-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.exv-top { opacity: 0; animation: exvFade 1.7s ease-in-out infinite; }
@keyframes exvFade { 0%, 18% { opacity: 0; } 50%, 68% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .exv-top { animation: none; opacity: 0; } }
`;
