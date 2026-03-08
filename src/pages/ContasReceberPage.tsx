import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ContasReceberPage() {
  const { selectedYear } = useYear();
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Use lancamentos with tipo='R' as contas a receber since the table may be empty
      const { data } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(codigo, descricao), clientes(nome), socios(nome)')
        .eq('tipo', 'R')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`)
        .order('data_lancamento', { ascending: false });
      setContas(data || []);
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  const pendentes = contas.filter(c => c.status === 'Pendente');
  const pagos = contas.filter(c => c.status === 'Pago');
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor_realizado), 0);
  const totalPago = pagos.reduce((s, c) => s + Number(c.valor_realizado), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</div>
            <p className="text-xs text-muted-foreground">{pendentes.length} pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</div>
            <p className="text-xs text-muted-foreground">{pagos.length} recebidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendente + totalPago)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Sócio</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-2">{formatDate(c.data_lancamento)}</td>
                      <td className="py-2.5 px-2">{c.clientes?.nome || '-'}</td>
                      <td className="py-2.5 px-2 hidden md:table-cell truncate max-w-[250px]">{c.descricao}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell">{c.socios?.nome || '-'}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-success">{formatCurrency(c.valor_realizado)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={c.status === 'Pago' ? 'secondary' : 'outline'}>{c.status}</Badge>
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
