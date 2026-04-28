"use client";

import { useState } from "react";
import { sendMagicLink } from "@/lib/auth";

type Props = {
  onClose: () => void;
};

export function SignIn({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const { error: err } = await sendMagicLink(trimmed);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-surface border border-hairline flex items-center justify-center text-text"
          aria-label="Back"
        >
          ‹
        </button>
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">
          Sign in
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 flex flex-col">
        {!sent && (
          <>
            <h1 className="text-2xl font-light leading-snug mb-2">
              Sync across devices.
            </h1>
            <p className="text-text-2 text-sm mb-6">
              Sign in to save your sessions and use Claude when you&apos;re stuck.
              The timer keeps working without an account.
            </p>

            <label className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-2">
              Your email
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 200))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-text placeholder:text-text-3 outline-none focus:border-accent transition"
            />

            {error && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!email.trim() || loading}
              className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold mt-6 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>

            <div className="text-text-3 text-xs text-center mt-6 leading-relaxed">
              No password. We&apos;ll email you a link to sign in.
            </div>
          </>
        )}

        {sent && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-light leading-snug mb-2">
              Check your inbox.
            </h1>
            <p className="text-text-2 text-sm max-w-xs">
              We sent a magic link to <strong className="text-text">{email}</strong>. Tap it
              to sign in. The link works only on this device.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-8 text-text-3 text-sm"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
