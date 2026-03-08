import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  resultado: number;
}

const COLORS = ['hsl(217, 71%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export default function DashboardPage() {
  const { selectedYear } = useYear();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totals, setTotals] = useState({ receitas: 0, despesas: 0, pendentes: 0 });
  const [topDespesas, setTopDespesas] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(grupo, descricao)')
        .gte('competencia', startDate)
        .lte('competencia', endDate);

      if (!lancamentos) { setLoading(false); return; }

      // Monthly aggregation
      const monthly: Record<number, { receitas: number; despesas: number }> = {};
      for (let i = 0; i < 12; i++) monthly[i] = { receitas: 0, despesas: 0 };

      let totalR = 0, totalD = 0, pend = 0;
      const despByGroup: Record<string, number> = {};

      lancamentos.forEach((l: any) => {
        const m = new Date(l.competencia).getMonth();
        const val = Number(l.valor_realizado) || 0;
        if (l.tipo === 'R') {
          monthly[m].receitas += val;
          totalR += val;
        } else {
          monthly[m].despesas += val;
          totalD += val;
          const grp = l.plano_contas?.grupo || 'Outros';
          despByGroup[grp] = (despByGroup[grp] || 0) + val;
        }
        if (l.status === 'Pendente') pend += val;
      });

      setMonthlyData(
        Object.entries(monthly)
          .filter(([_, v]) => v.receitas > 0 || v.despesas > 0)
          .map(([m, v]) => ({
            month: getMonthName(Number(m)),
            receitas: v.receitas,
            despesas: v.despesas,
            resultado: v.receitas - v.despesas,
          }))
      );

      setTotals({ receitas: totalR, despesas: totalD, pendentes: pend });
      setTopDespesas(
        Object.entries(despByGroup)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))
      );
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  const resultado = totals.receitas - totals.despesas;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totals.receitas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.despesas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(resultado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totals.pendentes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receitas vs Despesas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--chart-receita))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--chart-despesa))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topDespesas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {topDespesas.map((_, i) => (
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
