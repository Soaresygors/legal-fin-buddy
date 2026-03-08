import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setValid(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Erro', description: 'Senha deve ter no mínimo 8 caracteres', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Erro', description: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso!' });
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 px-8 text-center">
            <p className="text-muted-foreground">Link inválido ou expirado.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/login')}>Voltar para login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          <KeyRound className="h-12 w-12 text-primary mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">Redefinir senha</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="Nova senha (mín. 8 caracteres)" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="Confirmar nova senha" className="pl-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redefinir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
