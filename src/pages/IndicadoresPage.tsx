import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { getCompetenciaMonth, toSafeNumber } from '@/lib/financial';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';

function sumByPrefixes(grouped: Record<string, Record<number, number>>, prefixes: string[], month: number): number {
  let sum = 0;
  for (const code of Object.keys(grouped)) {
    if (prefixes.some(p => code.startsWith(p))) sum += grouped[code][month] || 0;
  }
  return sum;
}

function sumPrefixesAllMonths(grouped: Record<string, Record<number, number>>, prefixes: string[]): number {
  let total = 0;
  for (let m = 1; m <= 12; m++) total += sumByPrefixes(grouped, prefixes, m);
  return total;
}

function sparkData(grouped: Record<string, Record<number, number>>, prefixes: string[]): { m: string; v: number }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    m: getMonthName(i),
    v: sumByPrefixes(grouped, prefixes, i + 1),
  }));
}

interface KPIProps {
  label: string;
  value: string;
  color?: string;
  spark?: { m: string; v: number }[];
  badge?: { value: number };
}

function KPICard({ label, value, color, spark, badge }: KPIProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${color || ''}`}>{value}</span>
          {badge && badge.value !== 0 && (
            <Badge variant="outline" className={`text-[10px] px-1.5 ${badge.value > 0 ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-rose-300 text-rose-700 bg-rose-50'}`}>
              {badge.value > 0 ? '+' : ''}{badge.value.toFixed(1)}%
            </Badge>
          )}
        </div>
        {spark && spark.some(s => s.v !== 0) && (
          <div className="mt-2">
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={spark}>
                <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function marginColor(val: number): string {
  if (val > 10) return 'text-emerald-600';
  if (val < 0) return 'text-destructive';
  return '';
}

export default function IndicadoresPage() {
  const { selectedYear } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const [lancRes, crRes, cpRes] = await Promise.all([
        supabase
          .from('lancamentos')
          .select('valor_realizado, competencia, plano_contas!inner(codigo)')
          .gte('competencia', `${selectedYear}-01-01`)
          .lte('competencia', `${selectedYear}-12-31`),
        supabase
          .from('contas_receber')
          .select('valor_original, juros_multa, valor_recebido, status')
          .in('status', ['Pendente', 'Vencido']),
        supabase
          .from('contas_pagar')
          .select('valor_original, desconto, juros_multa, valor_pago, status')
          .in('status', ['Pendente', 'Vencido']),
      ]);

        const grouped: Record<string, Record<number, number>> = {};
        (lancRes.data || []).forEach((l: any) => {
          const code = l.plano_contas?.codigo || '';
          const month = getCompetenciaMonth(l.competencia);
          if (!month) return;

          const val = toSafeNumber(l.valor_realizado);
          if (!grouped[code]) grouped[code] = {};
          grouped[code][month] = (grouped[code][month] || 0) + val;
        });

      const now = new Date();
      const mesAtual = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;

      // Receita Bruta
      const recBrutaPrefixes = ['1.1', '1.2', '1.3', '1.4', '1.7', '1.9'];
      const recBrutaAno = sumPrefixesAllMonths(grouped, recBrutaPrefixes);
      const recBrutaMesAtual = sumByPrefixes(grouped, recBrutaPrefixes, mesAtual);
      const recBrutaMesAnt = mesAtual > 1 ? sumByPrefixes(grouped, recBrutaPrefixes, mesAtual - 1) : 0;

      // Deduções
      const deducoes = sumPrefixesAllMonths(grouped, ['2.']);
      const recLiqAno = recBrutaAno - deducoes;

      // Custos Diretos
      const custDir = sumPrefixesAllMonths(grouped, ['3.']);
      const margemContrib = recLiqAno - custDir;

      // Despesas Operacionais
      const pessoalTotal = sumPrefixesAllMonths(grouped, ['4.']);
      const adminTotal = sumPrefixesAllMonths(grouped, ['5.']);
      const comercialTotal = sumPrefixesAllMonths(grouped, ['6.']);
      const totalDespOp = pessoalTotal + adminTotal + comercialTotal;

      const ebitda = margemContrib - totalDespOp;
      const despFin = sumPrefixesAllMonths(grouped, ['7.']);
      const recFinVal = sumPrefixesAllMonths(grouped, ['1.11']);
      const resAntesImp = ebitda - (despFin - recFinVal);
      const impostos = sumPrefixesAllMonths(grouped, ['8.']);
      const resLiq = resAntesImp - impostos;

      // MRR
      const mrr = sumByPrefixes(grouped, ['1.3'], mesAtual);
      const pctRecorrente = recBrutaMesAtual > 0 ? (mrr / recBrutaMesAtual) * 100 : 0;

      // Margens
      const margemContribPct = recBrutaAno > 0 ? (margemContrib / recBrutaAno) * 100 : 0;
      const margemOpPct = recBrutaAno > 0 ? (ebitda / recBrutaAno) * 100 : 0;
      const margemLiqPct = recBrutaAno > 0 ? (resLiq / recBrutaAno) * 100 : 0;

      // Caixa
      const saldoInicial = 82000;
      const entradasPrefixes = ['1.'];
      const totalEntradas = sumPrefixesAllMonths(grouped, entradasPrefixes);
      const saidasPrefixes = ['2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'];
      const totalSaidas = sumPrefixesAllMonths(grouped, saidasPrefixes);
      const saldoCaixa = saldoInicial + totalEntradas - totalSaidas;

      // Contas
      const aReceber = (crRes.data || []).reduce((s: number, r: any) =>
        s + (Number(r.valor_original) || 0) + (Number(r.juros_multa) || 0) - (Number(r.valor_recebido) || 0), 0);
      const aPagar = (cpRes.data || []).reduce((s: number, r: any) =>
        s + (Number(r.valor_original) || 0) - (Number(r.desconto) || 0) + (Number(r.juros_multa) || 0) - (Number(r.valor_pago) || 0), 0);

      // Variation badge
      const varRec = recBrutaMesAnt > 0 ? ((recBrutaMesAtual - recBrutaMesAnt) / recBrutaMesAnt) * 100 : 0;

      setData({
        recBrutaAno, recLiqAno, mrr, pctRecorrente, varRec,
        margemContribPct, margemOpPct, margemLiqPct, resLiq,
        totalDespOp, pessoalTotal, adminTotal, recBrutaAno2: recBrutaAno,
        saldoCaixa, totalEntradas, totalSaidas,
        aReceber, aPagar,
        sparkRec: sparkData(grouped, recBrutaPrefixes),
        sparkResLiq: Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const rec = sumByPrefixes(grouped, recBrutaPrefixes, m) - sumByPrefixes(grouped, ['2.'], m) - sumByPrefixes(grouped, ['3.'], m);
          const desp = sumByPrefixes(grouped, ['4.', '5.', '6.', '7.', '8.'], m);
          return { m: getMonthName(i), v: rec - desp };
        }),
      });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedYear]);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  const pctPessoal = data.recBrutaAno > 0 ? (data.pessoalTotal / data.recBrutaAno) * 100 : 0;
  const pctAdmin = data.recBrutaAno > 0 ? (data.adminTotal / data.recBrutaAno) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* FATURAMENTO */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Faturamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Receita Bruta Acumulada" value={formatCurrency(data.recBrutaAno)} spark={data.sparkRec} badge={{ value: data.varRec }} />
          <KPICard label="Receita Líquida Acumulada" value={formatCurrency(data.recLiqAno)} />
          <KPICard label="Receita Recorrente (MRR)" value={formatCurrency(data.mrr)} />
          <KPICard label="% Recorrente / Bruta" value={`${data.pctRecorrente.toFixed(1)}%`} color={marginColor(data.pctRecorrente)} />
        </div>
      </div>

      {/* LUCRATIVIDADE */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lucratividade</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Margem de Contribuição %" value={`${data.margemContribPct.toFixed(1)}%`} color={marginColor(data.margemContribPct)} />
          <KPICard label="Margem Operacional %" value={`${data.margemOpPct.toFixed(1)}%`} color={marginColor(data.margemOpPct)} />
          <KPICard label="Margem Líquida %" value={`${data.margemLiqPct.toFixed(1)}%`} color={marginColor(data.margemLiqPct)} />
          <KPICard label="Resultado Líquido Acumulado" value={formatCurrency(data.resLiq)} color={data.resLiq >= 0 ? 'text-emerald-600' : 'text-destructive'} spark={data.sparkResLiq} />
        </div>
      </div>

      {/* CUSTOS */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Custos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard label="Total Despesas Operacionais" value={formatCurrency(data.totalDespOp)} />
          <KPICard label="% Pessoal / Receita" value={`${pctPessoal.toFixed(1)}%`} color={marginColor(-pctPessoal + 50)} />
          <KPICard label="% Administrativas / Receita" value={`${pctAdmin.toFixed(1)}%`} color={marginColor(-pctAdmin + 20)} />
        </div>
      </div>

      {/* CAIXA */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Caixa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard label="Saldo de Caixa" value={formatCurrency(data.saldoCaixa)} color={data.saldoCaixa >= 0 ? 'text-emerald-600' : 'text-destructive'} />
          <KPICard label="Total Entradas no Ano" value={formatCurrency(data.totalEntradas)} color="text-emerald-600" />
          <KPICard label="Total Saídas no Ano" value={formatCurrency(data.totalSaidas)} color="text-destructive" />
        </div>
      </div>

      {/* CONTAS */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard label="A Receber Pendente" value={formatCurrency(data.aReceber)} color="text-amber-600" />
          <KPICard label="A Pagar Pendente" value={formatCurrency(data.aPagar)} color="text-destructive" />
        </div>
      </div>
    </div>
  );
}
