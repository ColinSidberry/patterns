"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/code";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/code-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace(next);
      router.refresh();
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-8 shadow-xl"
      >
        <h1 className="text-lg font-semibold text-[#cdd6f4]">Source code</h1>
        <p className="mt-1 text-sm text-[#a6adc8]">
          This area is private — it holds the source for my projects.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-5 w-full rounded-lg border border-white/10 bg-[#13131a] px-3 py-2 text-[#cdd6f4] outline-none focus:border-[#89b4fa]"
        />
        {error && <p className="mt-2 text-sm text-[#f38ba8]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-lg bg-[#89b4fa] px-3 py-2 font-medium text-[#13131a] transition hover:bg-[#74a0f0] disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
        <p className="mt-3 text-center text-xs text-[#6c7086]">
          Hint: the password is on my résumé.
        </p>
      </form>
    </main>
  );
}

export default function CodeLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
