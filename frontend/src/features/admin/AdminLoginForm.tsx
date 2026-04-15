"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Locale, Messages } from "@/i18n";
import { setAdminToken } from "@/lib/auth";
import { loginAdmin } from "@/lib/api";

export function AdminLoginForm({ locale, messages }: { locale: Locale; messages: Messages }) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginAdmin({ login, password });
      setAdminToken(result.access_token);
      router.push(`/${locale}/admin/streams`);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex justify-center">
        <LanguageSwitcher locale={locale} />
      </div>
      <Card className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f4bb41]">{messages.admin}</p>
          <h1 className="text-3xl font-black text-[#f7f0e2]">{messages.loginTitle}</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input value={login} onChange={(event) => setLogin(event.target.value)} placeholder={messages.usernameOrEmail} required data-disable-global-redirect />
          <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={messages.password} required type="password" data-disable-global-redirect />
          {error ? <p className="text-sm text-[#f5d7c9]">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit">{loading ? messages.loading : messages.login}</Button>
        </form>
      </Card>
    </div>
  );
}
