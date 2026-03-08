import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { getCompetenciaMonth, toSafeNumber } from '@/lib/financial';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, TrendingUp, Wallet, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  resultado: number;
}

interface TopCliente {
  nome: string;
  total: number;
  pct: number;
}

const PIE_COLORS: Record<string, string> = {
  'PESSOAL': '#3b82f6',
  'ADMINISTRATIVAS': '#10b981',
  'COMERCIAIS': '#f59e0b',
  'FINANCEIRAS': '#f43f5e',
  'IMPOSTOS': '#a855f7',
  'Outros': '#94a3b8',
};

function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, badge,
}: {
  label: string;
  value: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge?: { value: string; positive: boolean } | null;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {badge && (
            <Badge
              variant="secondary"
              className={`text-[10px] mt-1 ${badge.positive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}
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
    receitaMesAtual: 0,
    receitaMesAnterior: 0,
    resultadoMes: 0,
    saldoCaixa: 0,
    aReceberPendente: 0,
    aPagarPendente: 0,
  });
  const [despesasPie, setDespesasPie] = useState<{ name: string; value: number }[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const now = new Date();
      // If viewing current year, use current month. Otherwise use December (full year).
      const mesAtual = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;

      // 1) All lancamentos for selectedYear
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(codigo, grupo), clientes(nome)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      // 2) All lancamentos ever (for saldo de caixa)
      const { data: allLanc } = await supabase
        .from('lancamentos')
        .select('tipo, valor_realizado, status')
        .eq('status', 'Pago');

      // 3) Saldos iniciais
      const { data: bancos } = await supabase
        .from('contas_bancarias')
        .select('saldo_inicial');

      // 4) Contas a receber pendentes
      const { data: cReceberPend } = await supabase
        .from('contas_receber')
        .select('valor_original, juros_multa, valor_recebido')
        .in('status', ['Pendente', 'Vencido']);

      // 5) Contas a pagar pendentes
      const { data: cPagarPend } = await supabase
        .from('contas_pagar')
        .select('valor_original, desconto, juros_multa, valor_pago')
        .in('status', ['Pendente', 'Vencido']);

      if (!lancamentos) return;

      // Monthly aggregation (all 12 months)
      const monthly: Record<number, { receitas: number; despesas: number }> = {};
      for (let i = 0; i < 12; i++) monthly[i] = { receitas: 0, despesas: 0 };

      // Despesas by group code prefix
      const despByCategory: Record<string, number> = {
        'PESSOAL': 0,
        'ADMINISTRATIVAS': 0,
        'COMERCIAIS': 0,
        'FINANCEIRAS': 0,
        'IMPOSTOS': 0,
        'Outros': 0,
      };

      // Top clientes
      const clienteMap: Record<string, { nome: string; total: number }> = {};

      lancamentos.forEach((l: any) => {
        const month = getCompetenciaMonth(l.competencia);
        if (!month) return;

        const m = month - 1;
        const val = toSafeNumber(l.valor_realizado);
        const codigo = l.plano_contas?.codigo || '';
        const grupo = l.plano_contas?.grupo || '';

        if (l.tipo === 'R') {
          monthly[m].receitas += val;
          // Top clientes
          if (l.clientes?.nome) {
            const cid = l.cliente_id || l.clientes.nome;
            if (!clienteMap[cid]) clienteMap[cid] = { nome: l.clientes.nome, total: 0 };
            clienteMap[cid].total += val;
          }
        } else {
          monthly[m].despesas += val;
          // Categorize despesas by code prefix
          if (codigo.startsWith('4.')) despByCategory['PESSOAL'] += val;
          else if (codigo.startsWith('5.')) despByCategory['ADMINISTRATIVAS'] += val;
          else if (codigo.startsWith('6.')) despByCategory['COMERCIAIS'] += val;
          else if (codigo.startsWith('7.')) despByCategory['FINANCEIRAS'] += val;
          else if (codigo.startsWith('8.')) despByCategory['IMPOSTOS'] += val;
          else despByCategory['Outros'] += val;
        }
      });

      // Receita mês atual e anterior
      const mesIdx = mesAtual - 1;
      const mesAntIdx = mesIdx > 0 ? mesIdx - 1 : 11;
      const receitaMesAtual = monthly[mesIdx]?.receitas || 0;
      const receitaMesAnterior = monthly[mesAntIdx]?.receitas || 0;
      const resultadoMes = (monthly[mesIdx]?.receitas || 0) - (monthly[mesIdx]?.despesas || 0);

      // Saldo de caixa
      const saldoInicial = (bancos || []).reduce((s, b) => s + (Number(b.saldo_inicial) || 0), 0);
      let totalRecPago = 0, totalDesPago = 0;
      (allLanc || []).forEach((l: any) => {
        const val = toSafeNumber(l.valor_realizado);
        if (l.tipo === 'R') totalRecPago += val;
        else totalDesPago += val;
      });
      const saldoCaixa = saldoInicial + totalRecPago - totalDesPago;

      // Contas a receber pendente
      const aReceberPendente = (cReceberPend || []).reduce((s, c) =>
        s + (Number(c.valor_original) || 0) + (Number(c.juros_multa) || 0) - (Number(c.valor_recebido) || 0), 0);

      // Contas a pagar pendente
      const aPagarPendente = (cPagarPend || []).reduce((s, c) =>
        s + (Number(c.valor_original) || 0) - (Number(c.desconto) || 0) + (Number(c.juros_multa) || 0) - (Number(c.valor_pago) || 0), 0);

      // Also count lancamentos pendentes as fallback for a receber / a pagar
      let lancPendR = 0, lancPendD = 0;
      lancamentos.forEach((l: any) => {
        if (l.status === 'Pendente') {
          const val = toSafeNumber(l.valor_realizado);
          if (l.tipo === 'R') lancPendR += val;
          else lancPendD += val;
        }
      });

      setKpis({
        receitaMesAtual,
        receitaMesAnterior,
        resultadoMes,
        saldoCaixa,
        aReceberPendente: aReceberPendente || lancPendR,
        aPagarPendente: aPagarPendente || lancPendD,
      });

      // Monthly chart data (all 12 months)
      setMonthlyData(
        Array.from({ length: 12 }, (_, i) => ({
          month: getMonthName(i),
          receitas: monthly[i].receitas,
          despesas: monthly[i].despesas,
          resultado: monthly[i].receitas - monthly[i].despesas,
        }))
      );

      // Pie chart
      setDespesasPie(
        Object.entries(despByCategory)
          .filter(([_, v]) => v > 0)
          .map(([name, value]) => ({ name, value }))
      );

      // Top 5 clientes
      const totalFat = Object.values(clienteMap).reduce((s, c) => s + c.total, 0);
      setTopClientes(
        Object.values(clienteMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map((c, i) => ({
            nome: c.nome,
            total: c.total,
            pct: totalFat > 0 ? (c.total / totalFat) * 100 : 0,
          }))
      );

      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  const variacao = kpis.receitaMesAnterior > 0
    ? ((kpis.receitaMesAtual - kpis.receitaMesAnterior) / kpis.receitaMesAnterior) * 100
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Receita Bruta do Mês"
          value={formatCurrency(kpis.receitaMesAtual)}
          icon={DollarSign}
          iconBg="bg-success/10"
          iconColor="text-success"
          badge={variacao !== null ? {
            value: `${Math.abs(variacao).toFixed(1)}% vs mês ant.`,
            positive: variacao >= 0,
          } : null}
        />
        <KpiCard
          label="Resultado Líquido do Mês"
          value={formatCurrency(kpis.resultadoMes)}
          icon={TrendingUp}
          iconBg={kpis.resultadoMes >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
          iconColor={kpis.resultadoMes >= 0 ? 'text-success' : 'text-destructive'}
        />
        <KpiCard
          label="Saldo de Caixa Atual"
          value={formatCurrency(kpis.saldoCaixa)}
          icon={Wallet}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <KpiCard
          label="A Receber Pendente"
          value={formatCurrency(kpis.aReceberPendente)}
          icon={ArrowDownToLine}
          iconBg="bg-warning/10"
          iconColor="text-warning"
        />
        <KpiCard
          label="A Pagar Pendente"
          value={formatCurrency(kpis.aPagarPendente)}
          icon={ArrowUpFromLine}
          iconBg="bg-destructive/10"
          iconColor="text-destructive"
        />
      </div>

      {/* Row 2: BarChart + LineChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold mb-4">Receita vs Despesa — {selectedYear}</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold mb-4">Resultado Líquido Mensal — {selectedYear}</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradResult" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                <XAxis dataKey="month" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="resultado" name="Resultado" stroke="#2563eb" strokeWidth={2} fill="url(#gradResult)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: PieChart + Top Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold mb-4">Composição das Despesas — {selectedYear}</p>
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
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold mb-4">Top 5 Clientes por Faturamento — {selectedYear}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total Faturado</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topClientes.map((c, i) => (
                    <tr key={c.nome} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-2 font-medium">{c.nome}</td>
                      <td className="py-3 px-2 text-right text-success font-medium">{formatCurrency(c.total)}</td>
                      <td className="py-3 px-2 text-right text-muted-foreground">{c.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {topClientes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum dado encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
