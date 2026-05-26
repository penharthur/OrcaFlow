import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/budget-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Orçamentos" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.trim() && pwd.trim()) {
      auth.login();
      navigate({ to: "/" });
    } else {
      setErr("Preencha os campos para continuar.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-card border rounded-xl p-8 shadow-sm space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-serif">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Acesse para criar e gerenciar orçamentos.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="u">Usuário</Label>
          <Input id="u" value={user} onChange={(e) => setUser(e.target.value)} autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p">Senha</Label>
          <Input id="p" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </div>
  );
}
