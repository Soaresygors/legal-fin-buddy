import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, formatDate, getMonthName } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  resultado: number;
}
const PIE_COLORS: Record<string, string> = {
  'Pessoal': '#1F3864',
  'Administrativo': '#2E75B6',
  'Impostos': '#f59e0b',
  'Operacional': '#10b981',
  'Marketing': '#a855f7',
  'Outros': '#94a3b8',
};

const STATUS_BADGE: Record<string, string> = {
  Pago: 'bg-[#DCFCE7] text-[#166534]',
  Pendente: 'bg-[#FEF9C3] text-[#854D0E]',
  Vencido: 'bg-[#FEE2E2] text-[#991B1B]',
  'A vencer': 'bg-[#DBEAFE] text-[#1E40AF]',
  Cancelado: 'bg-[#F3F4F6] text-[#6B7280]',
};

function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, badge, valueColor,
}: {
  label: string;
  value: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  badge?: { value: string; positive: boolean } | null;
}) {
  return (
    <Card className="rounded-xl shadow-sm bg-white">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className={`text-xl font-bold truncate ${valueColor || ''}`}>{value}</p>
          {badge && (
            <Badge
              variant="secondary"
              className={`text-[10px] mt-1 ${badge.positive ? 'text-[#166534] bg-[#DCFCE7]' : 'text-[#991B1B] bg-[#FEE2E2]'}`}
            >
              {badge.positive ? '▲' : '▼'} {badge.value}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { selectedYear } = useYear();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [kpis, setKpis] = useState({
    receitaTotal: 0,
    despesaTotal: 0,
    resultado: 0,
    margem: 0,
    variacaoReceita: null as number | null,
  });
  const [despesasPie, setDespesasPie] = useState<{ name: string; value: number }[]>([]);
  const [ultimosLancamentos, setUltimosLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(codigo, grupo, descricao), clientes(nome)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      const hasData = lancamentos && lancamentos.length > 0;

      if (!hasData) {
        setMonthlyData([]);
        setKpis({ receitaTotal: 0, despesaTotal: 0, resultado: 0, margem: 0, variacaoReceita: null });
        setDespesasPie([]);
        setUltimosLancamentos([]);
        setLoading(false);
        return;
      }

      // Real data processing
      const monthly: Record<number, { receitas: number; despesas: number }> = {};
      for (let i = 0; i < 12; i++) monthly[i] = { receitas: 0, despesas: 0 };

      const despByCategory: Record<string, number> = {};
      const now = new Date();
      const mesAtual = selectedYear === now.getFullYear() ? now.getMonth() : 11;

      lancamentos.forEach((l: any) => {
        const m = new Date(l.competencia).getMonth();
        const val = Number(l.valor_realizado) || 0;
        const grupo = l.plano_contas?.grupo || 'Outros';

        if (l.tipo === 'R') {
          monthly[m].receitas += val;
        } else {
          monthly[m].despesas += val;
          despByCategory[grupo] = (despByCategory[grupo] || 0) + val;
        }
      });

      const receitaTotal = Object.values(monthly).reduce((s, m) => s + m.receitas, 0);
      const despesaTotal = Object.values(monthly).reduce((s, m) => s + m.despesas, 0);
      const resultado = receitaTotal - despesaTotal;

      const recMesAtual = monthly[mesAtual]?.receitas || 0;
      const recMesAnterior = mesAtual > 0 ? (monthly[mesAtual - 1]?.receitas || 0) : 0;
      const variacao = recMesAnterior > 0
        ? ((recMesAtual - recMesAnterior) / recMesAnterior) * 100
        : null;

      setKpis({
        receitaTotal,
        despesaTotal,
        resultado,
        margem: receitaTotal > 0 ? (resultado / receitaTotal) * 100 : 0,
        variacaoReceita: variacao,
      });

      setMonthlyData(
        Array.from({ length: 12 }, (_, i) => ({
          month: getMonthName(i),
          receitas: monthly[i].receitas,
          despesas: monthly[i].despesas,
          resultado: monthly[i].receitas - monthly[i].despesas,
        })).filter(m => m.receitas > 0 || m.despesas > 0)
      );

      setDespesasPie(
        Object.entries(despByCategory)
          .filter(([_, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value }))
      );

      // Últimos lançamentos
      const { data: ultimos } = await supabase
        .from('lancamentos')
        .select('id, data_lancamento, descricao, plano_contas(descricao), valor_realizado, tipo, status')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`)
        .order('data_lancamento', { ascending: false })
        .limit(5);

      if (ultimos && ultimos.length > 0) {
        setUltimosLancamentos(ultimos.map((l: any) => ({
          id: l.id,
          data: l.data_lancamento,
          descricao: l.descricao,
          conta: l.plano_contas?.descricao || '—',
          valor: Number(l.valor_realizado),
          tipo: l.tipo,
          status: l.status,
        })));
      } else {
        setUltimosLancamentos(DEMO_LANCAMENTOS);
      }

      setLoading(false);
    }
    load();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards - 4 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita Total"
          value={formatCurrency(kpis.receitaTotal)}
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          valueColor="text-green-700"
          badge={kpis.variacaoReceita !== null ? {
            value: `${Math.abs(kpis.variacaoReceita).toFixed(1)}% vs mês ant.`,
            positive: kpis.variacaoReceita >= 0,
          } : null}
        />
        <KpiCard
          label="Total Despesas"
          value={formatCurrency(kpis.despesaTotal)}
          icon={TrendingDown}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          valueColor="text-red-700"
        />
        <KpiCard
          label="Resultado Líquido"
          value={formatCurrency(kpis.resultado)}
          icon={DollarSign}
          iconBg={kpis.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}
          iconColor={kpis.resultado >= 0 ? 'text-green-600' : 'text-red-600'}
          valueColor={kpis.resultado >= 0 ? 'text-green-700' : 'text-red-700'}
        />
        <KpiCard
          label="Margem Líquida"
          value={`${kpis.margem.toFixed(1)}%`}
          icon={Percent}
          iconBg="bg-blue-50"
          iconColor="text-[#2E75B6]"
          valueColor="text-[#1F3864]"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <Card className="rounded-xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-[#1F3864] mb-4">Receitas vs Despesas — {selectedYear}</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={11} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receita" fill="#1F3864" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="rounded-xl shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-[#1F3864] mb-4">Composição das Despesas — {selectedYear}</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={despesasPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  dataKey="value"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  fontSize={11}
                >
                  {despesasPie.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart */}
      <Card className="rounded-xl shadow-sm bg-white">
        <CardContent className="pt-6">
          <p className="text-sm font-semibold text-[#1F3864] mb-4">Evolução do Resultado Líquido — {selectedYear}</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradResult" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2E75B6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="resultado" name="Resultado" stroke="#2E75B6" strokeWidth={2} fill="url(#gradResult)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Últimos Lançamentos */}
      <Card className="rounded-xl shadow-sm bg-white">
        <CardContent className="pt-6">
          <p className="text-sm font-semibold text-[#1F3864] mb-4">Últimos Lançamentos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Conta</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimosLancamentos.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 whitespace-nowrap">{formatDate(l.data)}</td>
                    <td className="py-3 px-2 max-w-[250px] truncate">{l.descricao}</td>
                    <td className="py-3 px-2 text-muted-foreground">{l.conta}</td>
                    <td className={`py-3 px-2 text-right font-medium font-mono ${l.tipo === 'R' ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(l.valor)}
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={`text-[10px] border-0 ${STATUS_BADGE[l.status] || 'bg-gray-100 text-gray-600'}`}>
                        {l.status}
                      </Badge>
                    </td>
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
