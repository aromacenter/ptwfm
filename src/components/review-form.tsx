"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function ReviewForm({
  trainerId,
  initialRating,
  initialComment,
}: {
  trainerId: string;
  initialRating: number;
  initialComment: string;
}) {
  const t = useTranslations("reviews");
  const router = useRouter();

  const [rating, setRating] = useState(initialRating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (rating < 1) return;
    setPending(true);
    setSaved(false);
    setError(false);
    const res = await fetch(`/api/trainers/${trainerId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setPending(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {initialRating ? t("editTitle") : t("formTitle")}
      </p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t("ratingLabel")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none"
          >
            <span className={(hover || rating) >= n ? "text-amber-500" : "text-foreground/25"}>
              ★
            </span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentPlaceholder")}
        rows={3}
        maxLength={1000}
        className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || rating < 1}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("submit")}
        </button>
        {saved && (
          <span role="status" className="text-sm text-green-700">
            {t("saved")}
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {t("error")}
          </span>
        )}
      </div>
    </div>
  );
}
