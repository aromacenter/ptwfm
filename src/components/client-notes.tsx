"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Note = { id: string; content: string; createdAt: string };

export function ClientNotes({ clientId }: { clientId: string }) {
  const t = useTranslations("clients");
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/clients/${clientId}/notes`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d: { notes: Note[] }) => {
        if (active) setNotes(d.notes);
      });
    return () => {
      active = false;
    };
  }, [clientId]);

  async function add() {
    const content = draft.trim();
    if (!content) return;
    setPending(true);
    const res = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setPending(false);
    if (res.ok) {
      const { note } = (await res.json()) as { note: Note };
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="note" className="sr-only">
          {t("addNote")}
        </label>
        <textarea
          id="note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("notePlaceholder")}
          rows={3}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || draft.trim() === ""}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("addNote")}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noNotes")}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded border border-foreground/15 px-3 py-2 text-sm whitespace-pre-wrap"
            >
              {n.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
