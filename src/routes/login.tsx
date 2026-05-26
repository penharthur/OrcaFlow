import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — OrçaFlow" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        toast.success("Bem-vindo!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: {
            data: { name: name.trim(), phone: phone.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Você já pode entrar.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha de autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border rounded-xl p-8 shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif">OrçaFlow</h1>
          <p className="text-sm text-muted-foreground">Orçamentos rápidos e profissionais.</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" />
          <TabsContent value="signup" />
        </Tabs>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nm">Nome completo</Label>
                <Input
                  id="nm"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome profissional"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph">Telefone / WhatsApp</Label>
                <Input
                  id="ph"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="em">E-mail</Label>
            <Input
              id="em"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={mode === "signin"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Senha</Label>
            <Input
              id="pw"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
