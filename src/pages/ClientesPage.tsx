import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clientes')
        .select('*, socios(nome)')
        .order('nome');
      setClientes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes ({clientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">CPF/CNPJ</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Área</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Sócio Resp.</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-2 font-medium">{c.nome}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant="secondary" className="text-xs">{c.tipo_pf_pj}</Badge>
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell font-mono text-xs">{c.cpf_cnpj}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell">{c.area_juridica}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell">{c.socios?.nome || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={c.status === 'Ativo' ? 'default' : 'outline'}>{c.status}</Badge>
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
