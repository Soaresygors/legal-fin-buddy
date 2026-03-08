import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface FluxoRow {
  month: string;
  entradas: number;
  saidas: number;
  saldo: number;
  acumulado: number;
}

export default function FluxoCaixaPage() {
  const { selectedYear } = useYear();
  const [data, setData] = useState<FluxoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('competencia, tipo, valor_realizado, status')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`)
        .eq('status', 'Pago');

      if (!lancamentos) { setLoading(false); return; }

      const monthly: Record<number, { entradas: number; saidas: number }> = {};
      for (let i = 0; i < 12; i++) monthly[i] = { entradas: 0, saidas: 0 };

      lancamentos.forEach((l: any) => {
        const m = new Date(l.competencia).getMonth();
        const val = Number(l.valor_realizado) || 0;
        if (l.tipo === 'R') monthly[m].entradas += val;
        else monthly[m].saidas += val;
      });

      let acumulado = 82000; // saldo inicial (soma dos saldos bancários)
      const rows: FluxoRow[] = [];
      for (let i = 0; i < 12; i++) {
        const { entradas, saidas } = monthly[i];
        if (entradas === 0 && saidas === 0 && rows.length === 0) continue;
        const saldo = entradas - saidas;
        acumulado += saldo;
        rows.push({ month: getMonthName(i), entradas, saidas, saldo, acumulado });
        if (entradas === 0 && saidas === 0 && rows.length > 0) break;
      }

      setData(rows);
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  const totalEntradas = data.reduce((s, r) => s + r.entradas, 0);
  const totalSaidas = data.reduce((s, r) => s + r.saidas, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Entradas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{formatCurrency(totalEntradas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Saídas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Acumulado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(data[data.length - 1]?.acumulado || 82000)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Fluxo de Caixa {selectedYear}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.1} />
                <Area type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(var(--chart-receita))" fill="hsl(var(--chart-receita))" fillOpacity={0.1} />
                <Area type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(var(--chart-despesa))" fill="hsl(var(--chart-despesa))" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento Mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Entradas</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Saídas</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Saldo</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.month} className="border-b border-border/50">
                    <td className="py-2.5 px-2 font-medium">{r.month}</td>
                    <td className="py-2.5 px-2 text-right text-success">{formatCurrency(r.entradas)}</td>
                    <td className="py-2.5 px-2 text-right text-destructive">{formatCurrency(r.saidas)}</td>
                    <td className={`py-2.5 px-2 text-right font-medium ${r.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(r.saldo)}</td>
                    <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(r.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
