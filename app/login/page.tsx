'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/setup/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { requiresSetup?: boolean };
        setRequiresSetup(data.requiresSetup === true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (response.ok) {
        router.replace('/dashboard');
        router.refresh();
      } else {
        setError(data?.error || 'Sign in failed. Check your details and try again.');
      }
    } catch {
      setError('Sign in is temporarily unavailable. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <span className="text-3xl font-bold text-white">G</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-950">GymPro</h1>
          <p className="mt-1 text-gray-600">Management System</p>
        </div>

        <section aria-labelledby="login-heading" className="rounded-2xl border border-white/70 bg-white p-6 shadow-xl sm:p-8">
          <div className="text-center">
            <h2 id="login-heading" className="text-2xl font-bold text-gray-950">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in to manage your gym operations.</p>
          </div>

          {requiresSetup && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-semibold">This gym has not been set up yet.</p>
              <p className="mt-1 text-blue-800">Create the first administrator account to get started.</p>
              <Link href="/setup" className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Set up your gym
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required disabled={loading} value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100" placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required disabled={loading} value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100" />
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-sm text-gray-500">© 2026 GymPro Management System</p>
      </div>
    </main>
  );
}
