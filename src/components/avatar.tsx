function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Trainer avatar: shows the uploaded photo, or initials when none is set.
 * `version` busts the cache after a photo change. */
export function Avatar({
  name,
  trainerId,
  hasPhoto,
  size = 96,
  version,
}: {
  name: string;
  trainerId: string;
  hasPhoto: boolean;
  size?: number;
  version?: string | number;
}) {
  const dimension = { width: size, height: size };
  if (hasPhoto) {
    const src = `/api/trainers/${trainerId}/photo${version ? `?v=${version}` : ""}`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={dimension}
        className="rounded-full object-cover ring-2 ring-background"
      />
    );
  }
  return (
    <div
      style={dimension}
      className="flex items-center justify-center rounded-full bg-foreground/10 font-semibold text-foreground/60"
      aria-label={name}
    >
      <span style={{ fontSize: size / 2.8 }}>{initials(name)}</span>
    </div>
  );
}
