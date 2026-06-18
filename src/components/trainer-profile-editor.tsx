"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/avatar";
import { validateImageUpload } from "@/lib/validation/image";

// Split a textarea (one item per line) into a trimmed, non-empty list.
const toLines = (text: string): string[] =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export function TrainerProfileEditor({
  trainerId,
  name,
  hasPhoto,
  photoVersion,
  initial,
}: {
  trainerId: string;
  name: string;
  hasPhoto: boolean;
  photoVersion: number;
  initial: {
    headline: string;
    bio: string;
    specialties: string[];
    qualifications: string[];
    achievements: string[];
    acceptingClients: boolean;
    hourlyRatePence: number;
  };
}) {
  const t = useTranslations("trainerProfile");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(name);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [specialtiesText, setSpecialtiesText] = useState(
    initial.specialties.join("\n"),
  );
  const [qualificationsText, setQualificationsText] = useState(
    initial.qualifications.join("\n"),
  );
  const [achievementsText, setAchievementsText] = useState(
    initial.achievements.join("\n"),
  );
  const [accepting, setAccepting] = useState(initial.acceptingClients);
  const [rate, setRate] = useState((initial.hourlyRatePence / 100).toFixed(2));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function save() {
    setPending(true);
    setSaved(false);
    setSaveError(false);
    const res = await fetch("/api/trainer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: displayName,
        headline,
        bio,
        specialties: toLines(specialtiesText),
        qualifications: toLines(qualificationsText),
        achievements: toLines(achievementsText),
        acceptingClients: accepting,
        hourlyRatePence: Math.round(Number(rate) * 100) || 0,
      }),
    });
    setPending(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setSaveError(true);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    const check = validateImageUpload(file.type, file.size);
    if (!check.ok) {
      setPhotoError(check.error === "size" ? t("photoTooLarge") : t("photoWrongType"));
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/trainer/profile/photo", {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (res.ok) router.refresh();
  }

  async function removePhoto() {
    setUploading(true);
    const res = await fetch("/api/trainer/profile/photo", { method: "DELETE" });
    setUploading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4 rounded border border-foreground/15 p-4">
      <div className="space-y-1">
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <Avatar
          name={displayName}
          trainerId={trainerId}
          hasPhoto={hasPhoto}
          size={72}
          version={photoVersion}
        />
        <div className="space-y-1">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-foreground/20 px-3 py-2 text-sm disabled:opacity-50"
            >
              {t("uploadPhoto")}
            </button>
            {hasPhoto && (
              <button
                type="button"
                disabled={uploading}
                onClick={removePhoto}
                className="rounded-full border border-foreground/20 px-3 py-2 text-sm disabled:opacity-50"
              >
                {t("removePhoto")}
              </button>
            )}
          </div>
          <p className="text-xs text-foreground/60">{t("photoHint")}</p>
          {photoError && (
            <p role="alert" className="text-xs text-red-600">
              {photoError}
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFile}
        />
      </div>

      <label className="block space-y-1 text-sm">
        <span>{t("name")}</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("headline")}</span>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder={t("headlinePlaceholder")}
          maxLength={120}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("bio")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("bioPlaceholder")}
          rows={4}
          maxLength={2000}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("specialties")}</span>
        <textarea
          value={specialtiesText}
          onChange={(e) => setSpecialtiesText(e.target.value)}
          placeholder={t("specialtiesPlaceholder")}
          rows={3}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("qualifications")}</span>
        <textarea
          value={qualificationsText}
          onChange={(e) => setQualificationsText(e.target.value)}
          placeholder={t("qualificationsPlaceholder")}
          rows={3}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("achievements")}</span>
        <textarea
          value={achievementsText}
          onChange={(e) => setAchievementsText(e.target.value)}
          placeholder={t("achievementsPlaceholder")}
          rows={3}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("hourlyRate")}</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-40 rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepting}
          onChange={(e) => setAccepting(e.target.checked)}
        />
        <span>{t("acceptingClients")}</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("save")}
        </button>
        {saved && (
          <span role="status" className="text-sm text-green-700">
            {t("saved")}
          </span>
        )}
        {saveError && (
          <span role="alert" className="text-sm text-red-600">
            {t("saveError")}
          </span>
        )}
      </div>
    </div>
  );
}
