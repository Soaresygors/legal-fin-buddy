import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setSent(true);
      toast({ title: 'Link enviado', description: 'Se este email estiver cadastrado, você receberá um link de recuperação.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível enviar o email.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          <KeyRound className="h-12 w-12 text-primary mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">Recuperar senha</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Informe seu email e enviaremos um link para redefinir sua senha
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Se este email estiver cadastrado, você receberá um link de recuperação em instantes.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-2">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="seu@email.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link de recuperação'}
              </Button>
              <Link to="/login" className="block text-sm text-primary hover:underline">
                Voltar para login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
