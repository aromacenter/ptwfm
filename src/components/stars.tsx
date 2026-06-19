// Read-only star rating display. Rounds to the nearest whole star for the
// glyphs; the precise average is shown alongside by callers.
export function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const filled = Math.round(value);
  return (
    <span className={`${size} leading-none`} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "text-amber-500" : "text-foreground/25"}>
          ★
        </span>
      ))}
    </span>
  );
}
