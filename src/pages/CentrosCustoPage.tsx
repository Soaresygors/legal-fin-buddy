import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CentrosCustoPage() {
  const [centros, setCentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('centros_custo').select('*').order('codigo');
      setCentros(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Centros de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Código</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Responsável</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {centros.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-2 font-mono text-xs">{c.codigo}</td>
                      <td className="py-2.5 px-2 font-medium">{c.nome}</td>
                      <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground">{c.descricao || '-'}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell">{c.responsavel || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={c.ativo ? 'default' : 'outline'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
