"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Exercise = { name: string; sets: string; reps: string; notes: string };
type Day = { label: string; exercises: Exercise[] };
type Program = { id: string; title: string; data: { notes?: string; days: Day[] } };

const emptyExercise = (): Exercise => ({ name: "", sets: "", reps: "", notes: "" });
const emptyDay = (): Day => ({ label: "", exercises: [emptyExercise()] });

export function WorkoutBuilder({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Program[];
}) {
  const t = useTranslations("plans");
  const [programs, setPrograms] = useState<Program[]>(initial);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<Day[]>([emptyDay()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  function patchDay(i: number, patch: Partial<Day>) {
    setDays((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));
  }
  function patchExercise(di: number, ei: number, patch: Partial<Exercise>) {
    setDays((d) =>
      d.map((day, idx) =>
        idx === di
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === ei ? { ...ex, ...patch } : ex,
              ),
            }
          : day,
      ),
    );
  }

  async function save() {
    if (title.trim() === "") return;
    setPending(true);
    setError(false);
    const res = await fetch(`/api/clients/${clientId}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes, days }),
    });
    setPending(false);
    if (res.ok) {
      const { program } = (await res.json()) as { program: Program };
      setPrograms((p) => [program, ...p]);
      setTitle("");
      setNotes("");
      setDays([emptyDay()]);
    } else {
      setError(true);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/clients/${clientId}/workouts?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setPrograms((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      {programs.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noWorkouts")}</p>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-foreground/15 px-4 py-3 text-sm"
            >
              <span>
                <strong>{p.title}</strong>{" "}
                <span className="text-foreground/60">
                  ({p.data.days?.length ?? 0})
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded border border-foreground/15 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t("newWorkout")}
        </summary>
        <div className="mt-3 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("planTitle")}
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notes")}
            rows={2}
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />

          {days.map((day, di) => (
            <div key={di} className="space-y-2 rounded border border-foreground/10 p-3">
              <div className="flex gap-2">
                <input
                  value={day.label}
                  onChange={(e) => patchDay(di, { label: e.target.value })}
                  placeholder={t("dayLabel")}
                  className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
                />
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDays((d) => d.filter((_, i) => i !== di))}
                    className="shrink-0 rounded-full border border-foreground/20 px-3 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              {day.exercises.map((ex, ei) => (
                <div key={ei} className="flex flex-wrap gap-2">
                  <input
                    value={ex.name}
                    onChange={(e) => patchExercise(di, ei, { name: e.target.value })}
                    placeholder={t("exerciseName")}
                    className="min-w-[8rem] flex-1 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    value={ex.sets}
                    onChange={(e) => patchExercise(di, ei, { sets: e.target.value })}
                    placeholder={t("sets")}
                    className="w-16 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    value={ex.reps}
                    onChange={(e) => patchExercise(di, ei, { reps: e.target.value })}
                    placeholder={t("reps")}
                    className="w-20 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchDay(di, {
                        exercises: day.exercises.filter((_, j) => j !== ei),
                      })
                    }
                    className="rounded-full border border-foreground/20 px-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchDay(di, { exercises: [...day.exercises, emptyExercise()] })
                }
                className="text-xs text-foreground/70 underline"
              >
                + {t("addExercise")}
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setDays((d) => [...d, emptyDay()])}
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
            >
              {t("addDay")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || title.trim() === ""}
              className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
            >
              {t("save")}
            </button>
            {error && <span className="text-sm text-red-600">{t("saveError")}</span>}
          </div>
        </div>
      </details>
    </div>
  );
}
