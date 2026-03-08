import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['hsl(217,71%,45%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

export default function IndicadoresPage() {
  const { selectedYear } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(grupo, descricao), socios(nome), centros_custo(nome)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      if (!lancamentos) { setLoading(false); return; }

      let receitas = 0, despesas = 0;
      const bySocio: Record<string, { receitas: number; despesas: number }> = {};
      const byCentro: Record<string, number> = {};

      lancamentos.forEach((l: any) => {
        const val = Number(l.valor_realizado) || 0;
        if (l.tipo === 'R') receitas += val;
        else despesas += val;

        const socio = l.socios?.nome || 'Sem sócio';
        if (!bySocio[socio]) bySocio[socio] = { receitas: 0, despesas: 0 };
        if (l.tipo === 'R') bySocio[socio].receitas += val;

        const cc = l.centros_custo?.nome || 'Outros';
        if (l.tipo === 'D') byCentro[cc] = (byCentro[cc] || 0) + val;
      });

      const mesesAtivos = new Set(lancamentos.map((l: any) => l.competencia)).size;
      const ticketMedio = mesesAtivos > 0 ? receitas / mesesAtivos : 0;
      const margemLiq = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;

      setData({
        receitas, despesas, ticketMedio, margemLiq, mesesAtivos,
        socioData: Object.entries(bySocio)
          .filter(([k]) => k !== 'Sem sócio')
          .map(([name, v]) => ({ name: name.replace('Dra. ', '').replace('Dr. ', ''), receitas: v.receitas })),
        centroData: Object.entries(byCentro)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value })),
      });
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento Médio/Mês</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(data.ticketMedio)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Margem Líquida</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${data.margemLiq >= 0 ? 'text-success' : 'text-destructive'}`}>{data.margemLiq.toFixed(1)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{formatCurrency(data.receitas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesa Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(data.despesas)}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por Sócio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.socioData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Despesas por Centro de Custo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.centroData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} fontSize={10}>
                  {data.centroData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
