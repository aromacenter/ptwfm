"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const [role, setRole] = useState<"CLIENT" | "TRAINER">("CLIENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      role,
      termsConsent: form.get("termsConsent") === "on",
      healthConsent: form.get("healthConsent") === "on",
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      // Map known i18n keys, otherwise show a generic message.
      const key = data?.error ?? "";
      setError(
        key.includes(".")
          ? t(key as never)
          : t("validation.consentRequired"),
      );
      return;
    }

    router.push("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">{t("auth.registerTitle")}</h1>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm">{t("auth.iAmA")}</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="CLIENT"
                checked={role === "CLIENT"}
                onChange={() => setRole("CLIENT")}
              />
              {t("auth.roleClient")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="TRAINER"
                checked={role === "TRAINER"}
                onChange={() => setRole("TRAINER")}
              />
              {t("auth.roleTrainer")}
            </label>
          </div>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm">
            {t("common.name")}
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm">
            {t("common.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm">
            {t("common.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
          />
        </div>

        {role === "CLIENT" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="healthConsent" className="mt-1" />
            <span>{t("auth.healthConsentLabel")}</span>
          </label>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="termsConsent"
            required
            className="mt-1"
          />
          <span>{t("auth.termsConsentLabel")}</span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? t("common.loading") : t("common.signUp")}
        </button>

        <p className="text-sm">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="underline">
            {t("common.signIn")}
          </Link>
        </p>
      </form>
    </main>
  );
}
