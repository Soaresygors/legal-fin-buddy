import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RowStyle = 'section' | 'subtotal' | 'total' | 'total-green' | 'total-red' | 'saldo-pos' | 'saldo-neg' | 'normal' | 'editable';

interface FCRow {
  label: string;
  months: number[];
  total: number;
  style: RowStyle;
  indent?: number;
}

function sumByPrefixes(grouped: Record<string, Record<number, number>>, prefixes: string[], month: number): number {
  let sum = 0;
  for (const code of Object.keys(grouped)) {
    if (prefixes.some(p => code.startsWith(p))) sum += grouped[code][month] || 0;
  }
  return sum;
}

function sumAll(m: number[]): number { return m.reduce((a, b) => a + b, 0); }

function makeRow(label: string, months: number[], style: RowStyle, indent?: number): FCRow {
  return { label, months, total: sumAll(months), style, indent };
}

function lineFromPrefixes(label: string, grouped: Record<string, Record<number, number>>, prefixes: string[], indent?: number): FCRow {
  const months = Array.from({ length: 12 }, (_, i) => sumByPrefixes(grouped, prefixes, i + 1));
  return makeRow(label, months, 'normal', indent);
}

function sumRows(...rows: FCRow[]): number[] {
  return Array.from({ length: 12 }, (_, i) => rows.reduce((s, r) => s + r.months[i], 0));
}

function subRows(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

export default function FluxoCaixaPage() {
  const { selectedYear } = useYear();
  const [rows, setRows] = useState<FCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saldoInicialJan, setSaldoInicialJan] = useState(82000);

  const buildRows = useCallback((grouped: Record<string, Record<number, number>>, saldoInicial: number) => {
    // ENTRADAS
    const honCont = lineFromPrefixes('Honorários Contratuais', grouped, ['1.1'], 1);
    const honExito = lineFromPrefixes('Honorários de Êxito', grouped, ['1.2'], 1);
    const honRec = lineFromPrefixes('Honorários Recorrentes', grouped, ['1.3'], 1);
    const consultorias = lineFromPrefixes('Consultorias', grouped, ['1.4'], 1);
    const reembolsos = lineFromPrefixes('Reembolsos', grouped, ['1.7'], 1);
    const recFin = lineFromPrefixes('Receitas Financeiras', grouped, ['1.11'], 1);
    const outrasRec = lineFromPrefixes('Outras Receitas', grouped, ['1.9'], 1);
    const entradasMonths = sumRows(honCont, honExito, honRec, consultorias, reembolsos, recFin, outrasRec);
    const totalEntradas = makeRow('TOTAL DE ENTRADAS', entradasMonths, 'total-green');

    // SAÍDAS
    const impRec = lineFromPrefixes('Impostos s/ Receita', grouped, ['2.'], 1);
    const custDir = lineFromPrefixes('Custos Diretos', grouped, ['3.'], 1);
    const pessoal = lineFromPrefixes('Pessoal', grouped, ['4.'], 1);
    const aluguelIptu = lineFromPrefixes('Aluguel + IPTU', grouped, ['5.1', '5.3'], 1);
    const utilidades = lineFromPrefixes('Utilidades', grouped, ['5.4', '5.5', '5.6'], 1);
    const tecnologia = lineFromPrefixes('Tecnologia', grouped, ['5.7', '5.8', '5.9'], 1);
    const matServ = lineFromPrefixes('Materiais e Serviços', grouped, ['5.10', '5.11', '5.12', '5.13', '5.14'], 1);
    const mktCom = lineFromPrefixes('Marketing/Comercial', grouped, ['6.'], 1);
    const despFin = lineFromPrefixes('Despesas Financeiras', grouped, ['7.'], 1);
    const impLucro = lineFromPrefixes('Impostos s/ Lucro', grouped, ['8.'], 1);
    const investCapex = lineFromPrefixes('Investimentos/CAPEX', grouped, ['10.'], 1);
    const distLucros = lineFromPrefixes('Distribuição Lucros', grouped, ['9.'], 1);
    const saidasMonths = sumRows(impRec, custDir, pessoal, aluguelIptu, utilidades, tecnologia, matServ, mktCom, despFin, impLucro, investCapex, distLucros);
    const totalSaidas = makeRow('TOTAL DE SAÍDAS', saidasMonths, 'total-red');

    // SALDO OPERACIONAL
    const saldoOpMonths = subRows(entradasMonths, saidasMonths);
    const totalSaldoOp = makeRow('SALDO OPERACIONAL', saldoOpMonths, 'total');

    // SALDO INICIAL / FINAL
    const saldoInicialMonths: number[] = [saldoInicial];
    const saldoFinalMonths: number[] = [];
    for (let i = 0; i < 12; i++) {
      saldoFinalMonths[i] = saldoInicialMonths[i] + saldoOpMonths[i];
      if (i < 11) saldoInicialMonths[i + 1] = saldoFinalMonths[i];
    }

    const saldoInicialRow: FCRow = { label: 'Saldo Inicial do Período', months: saldoInicialMonths, total: saldoInicialMonths[0], style: 'editable' };
    const saldoFinalTotal = saldoFinalMonths[11];
    const saldoFinalRow = makeRow('SALDO FINAL', saldoFinalMonths, saldoFinalTotal >= 0 ? 'saldo-pos' : 'saldo-neg');

    setRows([
      makeRow('SALDO INICIAL', [], 'section'),
      saldoInicialRow,

      makeRow('ENTRADAS (RECEITAS)', [], 'section'),
      honCont, honExito, honRec, consultorias, reembolsos, recFin, outrasRec,
      totalEntradas,

      makeRow('SAÍDAS (DESPESAS)', [], 'section'),
      impRec, custDir, pessoal, aluguelIptu, utilidades, tecnologia, matServ, mktCom, despFin, impLucro, investCapex, distLucros,
      totalSaidas,

      totalSaldoOp,
      saldoFinalRow,
    ]);
  }, []);

  const [grouped, setGrouped] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('lancamentos')
        .select('valor_realizado, competencia, plano_contas!inner(codigo)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      const g: Record<string, Record<number, number>> = {};
      (data || []).forEach((l: any) => {
        const code = l.plano_contas?.codigo || '';
        const month = new Date(l.competencia + 'T00:00:00').getMonth() + 1;
        const val = Number(l.valor_realizado) || 0;
        if (!g[code]) g[code] = {};
        g[code][month] = (g[code][month] || 0) + val;
      });

      setGrouped(g);
      buildRows(g, saldoInicialJan);
      setLoading(false);
    }
    load();
  }, [selectedYear, buildRows, saldoInicialJan]);

  useEffect(() => {
    if (Object.keys(grouped).length > 0) {
      buildRows(grouped, saldoInicialJan);
    }
  }, [saldoInicialJan, grouped, buildRows]);

  const rowClasses: Record<RowStyle, string> = {
    section: 'bg-muted font-bold text-foreground',
    subtotal: 'bg-muted/70 font-bold',
    total: 'bg-slate-800 text-white font-bold border-y-2 border-slate-900',
    'total-green': 'bg-emerald-100 text-emerald-800 font-bold border-y border-emerald-300',
    'total-red': 'bg-rose-100 text-rose-800 font-bold border-y border-rose-300',
    'saldo-pos': 'bg-emerald-100 text-emerald-700 font-bold border-y-2 border-emerald-400',
    'saldo-neg': 'bg-rose-100 text-rose-700 font-bold border-y-2 border-rose-400',
    normal: '',
    editable: 'bg-blue-50 text-blue-700 font-semibold',
  };

  function formatVal(val: number): string {
    if (val === 0) return '—';
    return formatCurrency(val);
  }

  function handleSaldoChange(raw: string) {
    const cleaned = raw.replace(/[^\d,-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) setSaldoInicialJan(num);
    else if (raw === '') setSaldoInicialJan(0);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo de Caixa — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto max-h-[75vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky left-0 z-20 bg-slate-900 min-w-[260px] text-left px-3 py-2 font-semibold">Descrição</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="text-right px-2 py-2 font-semibold min-w-[90px]">{getMonthName(i)}</th>
                    ))}
                    <th className="text-right px-3 py-2 font-semibold min-w-[100px] bg-slate-950">Total Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isSection = row.style === 'section';
                    const cls = rowClasses[row.style];
                    const isEven = idx % 2 === 0;
                    const baseBg = row.style === 'normal' ? (isEven ? 'bg-background' : 'bg-muted/30') : '';

                    return (
                      <tr key={idx} className={`${cls} ${baseBg} border-b border-border/20`}>
                        <td
                          className={`sticky left-0 z-[5] px-3 py-1.5 whitespace-nowrap ${cls} ${baseBg}`}
                          style={{ paddingLeft: row.indent ? `${row.indent * 16 + 12}px` : undefined }}
                        >
                          {row.label}
                        </td>
                        {isSection ? (
                          Array.from({ length: 13 }, (_, i) => <td key={i} className="px-2 py-1.5" />)
                        ) : (
                          <>
                            {row.months.map((v, i) => (
                              <td
                                key={i}
                                className={`text-right px-2 py-1.5 font-mono tabular-nums ${
                                  v < 0 ? 'text-destructive' : ''
                                } ${row.style === 'total' && v < 0 ? 'text-red-300' : ''}`}
                              >
                                {row.style === 'editable' && i === 0 ? (
                                  <input
                                    type="text"
                                    className="w-full text-right bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-blue-700 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    defaultValue={formatCurrency(v)}
                                    onBlur={(e) => handleSaldoChange(e.target.value)}
                                  />
                                ) : (
                                  formatVal(v)
                                )}
                              </td>
                            ))}
                            <td
                              className={`text-right px-3 py-1.5 font-mono tabular-nums font-semibold ${
                                row.style === 'total' ? 'bg-slate-950' : 'bg-muted/50'
                              } ${row.style === 'saldo-pos' ? 'bg-emerald-200' : ''} ${
                                row.style === 'saldo-neg' ? 'bg-rose-200' : ''
                              } ${row.style === 'total-green' ? 'bg-emerald-200' : ''} ${
                                row.style === 'total-red' ? 'bg-rose-200' : ''
                              } ${row.total < 0 ? 'text-destructive' : ''} ${
                                row.style === 'total' && row.total < 0 ? 'text-red-300' : ''
                              }`}
                            >
                              {formatVal(row.total)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
