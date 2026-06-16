"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">{t("auth.loginTitle")}</h1>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

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
            autoComplete="current-password"
            required
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? t("common.loading") : t("common.signIn")}
        </button>

        <p className="text-sm">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="underline">
            {t("common.signUp")}
          </Link>
        </p>
      </form>
    </main>
  );
}
