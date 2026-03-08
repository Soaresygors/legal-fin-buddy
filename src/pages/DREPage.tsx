import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, getMonthName } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

type RowStyle = 'section' | 'subtotal' | 'total' | 'percent' | 'normal' | 'result-positive' | 'result-negative';

interface DRERow {
  label: string;
  months: number[];
  total: number;
  style: RowStyle;
  indent?: number;
}

// Helper: sum values for codes matching any of the prefixes
function sumByPrefixes(
  grouped: Record<string, Record<number, number>>,
  prefixes: string[],
  month: number
): number {
  let sum = 0;
  for (const code of Object.keys(grouped)) {
    if (prefixes.some(p => code.startsWith(p))) {
      sum += grouped[code][month] || 0;
    }
  }
  return sum;
}

function sumAllMonths(months: number[]): number {
  return months.reduce((a, b) => a + b, 0);
}

function makeRow(label: string, months: number[], style: RowStyle, indent?: number): DRERow {
  return { label, months, total: sumAllMonths(months), style, indent };
}

function lineFromPrefixes(
  label: string,
  grouped: Record<string, Record<number, number>>,
  prefixes: string[],
  style: RowStyle = 'normal',
  indent?: number
): DRERow {
  const months = Array.from({ length: 12 }, (_, i) => sumByPrefixes(grouped, prefixes, i + 1));
  return makeRow(label, months, style, indent);
}

function sumRows(...rows: DRERow[]): number[] {
  return Array.from({ length: 12 }, (_, i) => rows.reduce((s, r) => s + r.months[i], 0));
}

function subtractRows(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function percentRow(label: string, numerator: number[], denominator: number[]): DRERow {
  const months = numerator.map((v, i) => (denominator[i] !== 0 ? (v / denominator[i]) * 100 : 0));
  return { label, months, total: sumAllMonths(denominator) !== 0 ? (sumAllMonths(numerator) / sumAllMonths(denominator)) * 100 : 0, style: 'percent' };
}

export default function DREPage() {
  const { selectedYear } = useYear();
  const [rows, setRows] = useState<DRERow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from('lancamentos')
        .select('valor_realizado, competencia, plano_contas!inner(codigo, grupo)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      // Group by codigo -> month -> sum
      const grouped: Record<string, Record<number, number>> = {};
      (data || []).forEach((l: any) => {
        const code = l.plano_contas?.codigo || '';
        const month = new Date(l.competencia + 'T00:00:00').getMonth() + 1;
        const val = Number(l.valor_realizado) || 0;
        if (!grouped[code]) grouped[code] = {};
        grouped[code][month] = (grouped[code][month] || 0) + val;
      });

      // 1. RECEITA BRUTA
      const honContratuais = lineFromPrefixes('Honorários Contratuais', grouped, ['1.1'], 'normal', 1);
      const honExito = lineFromPrefixes('Honorários de Êxito', grouped, ['1.2'], 'normal', 1);
      const honRecorrentes = lineFromPrefixes('Honorários Recorrentes', grouped, ['1.3'], 'normal', 1);
      const consultorias = lineFromPrefixes('Consultorias e Pareceres', grouped, ['1.4'], 'normal', 1);
      const reembolsos = lineFromPrefixes('Reembolsos', grouped, ['1.7'], 'normal', 1);
      const outrasRec = lineFromPrefixes('Outras Receitas', grouped, ['1.9'], 'normal', 1);
      const recBrutaMonths = sumRows(honContratuais, honExito, honRecorrentes, consultorias, reembolsos, outrasRec);
      const subtRecBruta = makeRow('SUBTOTAL RECEITA BRUTA', recBrutaMonths, 'subtotal');

      // 2. DEDUÇÕES
      const iss = lineFromPrefixes('ISS', grouped, ['2.1'], 'normal', 1);
      const pis = lineFromPrefixes('PIS', grouped, ['2.2'], 'normal', 1);
      const cofins = lineFromPrefixes('COFINS', grouped, ['2.3'], 'normal', 1);
      const irrf = lineFromPrefixes('IRRF', grouped, ['2.4'], 'normal', 1);
      const descontos = lineFromPrefixes('Descontos Concedidos', grouped, ['2.5'], 'normal', 1);
      const deducoesMonths = sumRows(iss, pis, cofins, irrf, descontos);
      const subtDeducoes = makeRow('SUBTOTAL DEDUÇÕES', deducoesMonths, 'subtotal');

      // 3. RECEITA LÍQUIDA
      const recLiqMonths = subtractRows(recBrutaMonths, deducoesMonths);
      const totalRecLiq = makeRow('RECEITA LÍQUIDA', recLiqMonths, 'total');

      // 4. CUSTOS DIRETOS
      const custas = lineFromPrefixes('Custas Processuais', grouped, ['3.1'], 'normal', 1);
      const taxas = lineFromPrefixes('Taxas', grouped, ['3.2'], 'normal', 1);
      const pericias = lineFromPrefixes('Perícias', grouped, ['3.3'], 'normal', 1);
      const correspondentes = lineFromPrefixes('Correspondentes', grouped, ['3.5'], 'normal', 1);
      const comissoes = lineFromPrefixes('Comissões', grouped, ['3.7'], 'normal', 1);
      const terceirizados = lineFromPrefixes('Terceirizados', grouped, ['3.6'], 'normal', 1);
      const custDirMonths = sumRows(custas, taxas, pericias, correspondentes, comissoes, terceirizados);
      const subtCustDir = makeRow('SUBTOTAL CUSTOS DIRETOS', custDirMonths, 'subtotal');

      // 5. MARGEM DE CONTRIBUIÇÃO
      const margemContribMonths = subtractRows(recLiqMonths, custDirMonths);
      const totalMargemContrib = makeRow('MARGEM DE CONTRIBUIÇÃO', margemContribMonths, 'total');
      const pctMargemContrib = percentRow('% Margem de Contribuição', margemContribMonths, recBrutaMonths);

      // 6. DESPESAS OPERACIONAIS
      // 6.1 Pessoal
      const salarios = lineFromPrefixes('Salários e Encargos', grouped, ['4.1'], 'normal', 2);
      const decTercFerias = lineFromPrefixes('13º e Férias', grouped, ['4.2', '4.3'], 'normal', 2);
      const fgtsInss = lineFromPrefixes('FGTS/INSS', grouped, ['4.4', '4.5'], 'normal', 2);
      const beneficios = lineFromPrefixes('Benefícios', grouped, ['4.6', '4.7', '4.8'], 'normal', 2);
      const estagiarios = lineFromPrefixes('Estagiários', grouped, ['4.9'], 'normal', 2);
      const proLabore = lineFromPrefixes('Pró-labore', grouped, ['4.11'], 'normal', 2);
      const pessoalMonths = sumRows(salarios, decTercFerias, fgtsInss, beneficios, estagiarios, proLabore);
      const subtPessoal = makeRow('Subtotal Pessoal', pessoalMonths, 'subtotal');

      // 6.2 Administrativas
      const aluguel = lineFromPrefixes('Aluguel', grouped, ['5.1'], 'normal', 2);
      const iptu = lineFromPrefixes('IPTU', grouped, ['5.3'], 'normal', 2);
      const energia = lineFromPrefixes('Energia', grouped, ['5.4'], 'normal', 2);
      const agua = lineFromPrefixes('Água', grouped, ['5.5'], 'normal', 2);
      const telefone = lineFromPrefixes('Telefone', grouped, ['5.6'], 'normal', 2);
      const techSoft = lineFromPrefixes('Tecnologia/Software', grouped, ['5.7', '5.8', '5.9'], 'normal', 2);
      const material = lineFromPrefixes('Material de Escritório', grouped, ['5.10'], 'normal', 2);
      const limpezaCopa = lineFromPrefixes('Limpeza/Copa', grouped, ['5.11', '5.13'], 'normal', 2);
      const contabilidade = lineFromPrefixes('Contabilidade', grouped, ['5.12'], 'normal', 2);
      const viagens = lineFromPrefixes('Viagens', grouped, ['5.15', '5.16', '5.17'], 'normal', 2);
      const adminMonths = sumRows(aluguel, iptu, energia, agua, telefone, techSoft, material, limpezaCopa, contabilidade, viagens);
      const subtAdmin = makeRow('Subtotal Administrativas', adminMonths, 'subtotal');

      // 6.3 Comerciais
      const marketing = lineFromPrefixes('Marketing', grouped, ['6.1'], 'normal', 2);
      const siteRedes = lineFromPrefixes('Site/Redes Sociais', grouped, ['6.2'], 'normal', 2);
      const eventos = lineFromPrefixes('Eventos', grouped, ['6.3'], 'normal', 2);
      const cursosAss = lineFromPrefixes('Cursos/Assinaturas', grouped, ['6.4', '6.5'], 'normal', 2);
      const comercialMonths = sumRows(marketing, siteRedes, eventos, cursosAss);
      const subtComercial = makeRow('Subtotal Comerciais', comercialMonths, 'subtotal');

      const totalDespOpMonths = sumRows(subtPessoal, subtAdmin, subtComercial);
      const totalDespOp = makeRow('TOTAL DESPESAS OPERACIONAIS', totalDespOpMonths, 'subtotal');

      // 7. EBITDA
      const ebitdaMonths = subtractRows(margemContribMonths, totalDespOpMonths);
      const totalEbitda = makeRow('EBITDA', ebitdaMonths, 'total');
      const pctMargemOp = percentRow('% Margem Operacional', ebitdaMonths, recBrutaMonths);

      // 8. DESPESAS FINANCEIRAS
      const tarifas = lineFromPrefixes('Tarifas Bancárias', grouped, ['7.1'], 'normal', 1);
      const juros = lineFromPrefixes('Juros', grouped, ['7.2'], 'normal', 1);
      const taxasCartao = lineFromPrefixes('Taxas de Cartão', grouped, ['7.5'], 'normal', 1);
      const multas = lineFromPrefixes('Multas', grouped, ['7.4'], 'normal', 1);
      const recFinanceiras = lineFromPrefixes('(-) Receitas Financeiras', grouped, ['1.11'], 'normal', 1);
      const despFinMonths = subtractRows(sumRows(tarifas, juros, taxasCartao, multas), recFinanceiras.months);
      const subtDespFin = makeRow('SUBTOTAL DESPESAS FINANCEIRAS', despFinMonths, 'subtotal');

      // 9. RESULTADO ANTES DOS IMPOSTOS
      const resAntesImpMonths = subtractRows(ebitdaMonths, despFinMonths);
      const totalResAntesImp = makeRow('RESULTADO ANTES DOS IMPOSTOS', resAntesImpMonths, 'total');

      // 10. IMPOSTOS SOBRE LUCRO
      const irpj = lineFromPrefixes('IRPJ/DARF', grouped, ['8.1'], 'normal', 1);
      const csll = lineFromPrefixes('CSLL', grouped, ['8.2'], 'normal', 1);
      const simples = lineFromPrefixes('Simples Nacional', grouped, ['8.3'], 'normal', 1);
      const impostosMonths = sumRows(irpj, csll, simples);
      const subtImpostos = makeRow('SUBTOTAL IMPOSTOS', impostosMonths, 'subtotal');

      // 11. RESULTADO LÍQUIDO
      const resLiqMonths = subtractRows(resAntesImpMonths, impostosMonths);
      const resLiqTotal = sumAllMonths(resLiqMonths);
      const totalResLiq = makeRow('RESULTADO LÍQUIDO', resLiqMonths, resLiqTotal >= 0 ? 'result-positive' : 'result-negative');
      const pctMargemLiq = percentRow('% Margem Líquida', resLiqMonths, recBrutaMonths);

      setRows([
        makeRow('1. RECEITA BRUTA', [], 'section'),
        honContratuais, honExito, honRecorrentes, consultorias, reembolsos, outrasRec,
        subtRecBruta,

        makeRow('2. DEDUÇÕES DA RECEITA', [], 'section'),
        iss, pis, cofins, irrf, descontos,
        subtDeducoes,

        totalRecLiq,

        makeRow('4. CUSTOS DIRETOS', [], 'section'),
        custas, taxas, pericias, correspondentes, comissoes, terceirizados,
        subtCustDir,

        totalMargemContrib,
        pctMargemContrib,

        makeRow('6. DESPESAS OPERACIONAIS', [], 'section'),
        makeRow('6.1 Pessoal', [], 'section'),
        salarios, decTercFerias, fgtsInss, beneficios, estagiarios, proLabore,
        subtPessoal,

        makeRow('6.2 Administrativas', [], 'section'),
        aluguel, iptu, energia, agua, telefone, techSoft, material, limpezaCopa, contabilidade, viagens,
        subtAdmin,

        makeRow('6.3 Comerciais', [], 'section'),
        marketing, siteRedes, eventos, cursosAss,
        subtComercial,

        totalDespOp,

        totalEbitda,
        pctMargemOp,

        makeRow('8. DESPESAS FINANCEIRAS', [], 'section'),
        tarifas, juros, taxasCartao, multas, recFinanceiras,
        subtDespFin,

        totalResAntesImp,

        makeRow('10. IMPOSTOS SOBRE LUCRO', [], 'section'),
        irpj, csll, simples,
        subtImpostos,

        totalResLiq,
        pctMargemLiq,
      ]);

      setLoading(false);
    }
    load();
  }, [selectedYear]);

  const rowClasses: Record<RowStyle, string> = {
    section: 'bg-muted font-bold text-foreground',
    subtotal: 'bg-muted/70 font-bold',
    total: 'bg-slate-800 text-white font-bold border-y-2 border-slate-900',
    percent: 'bg-amber-50 text-amber-800 italic text-xs',
    normal: '',
    'result-positive': 'bg-emerald-100 text-emerald-900 font-bold border-y-2 border-emerald-300',
    'result-negative': 'bg-red-100 text-red-900 font-bold border-y-2 border-red-300',
  };

  function formatVal(val: number, isPercent: boolean): string {
    if (isPercent) return val === 0 ? '—' : `${val.toFixed(1)}%`;
    if (val === 0) return '—';
    return formatCurrency(val);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">DRE — Demonstrativo de Resultados {selectedYear}</CardTitle>
          <Button variant="outline" size="sm" disabled>
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto max-h-[75vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky left-0 z-20 bg-slate-900 min-w-[280px] text-left px-3 py-2 font-semibold">Descrição</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="text-right px-2 py-2 font-semibold min-w-[90px]">{getMonthName(i)}</th>
                    ))}
                    <th className="text-right px-3 py-2 font-semibold min-w-[100px] bg-slate-950">Total Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isSection = row.style === 'section';
                    const isPercent = row.style === 'percent';
                    const cls = rowClasses[row.style];
                    const isEven = idx % 2 === 0;
                    const baseBg = row.style === 'normal' ? (isEven ? 'bg-background' : 'bg-muted/30') : '';

                    return (
                      <tr key={idx} className={`${cls} ${baseBg} border-b border-border/20`}>
                        <td
                          className={`sticky left-0 z-[5] px-3 py-1.5 whitespace-nowrap ${cls} ${baseBg} ${
                            row.style === 'total' || row.style === 'result-positive' || row.style === 'result-negative'
                              ? ''
                              : ''
                          }`}
                          style={{ paddingLeft: row.indent ? `${row.indent * 16 + 12}px` : undefined }}
                        >
                          {row.label}
                        </td>
                        {isSection ? (
                          <>
                            {Array.from({ length: 13 }, (_, i) => (
                              <td key={i} className="px-2 py-1.5" />
                            ))}
                          </>
                        ) : (
                          <>
                            {row.months.map((v, i) => (
                              <td
                                key={i}
                                className={`text-right px-2 py-1.5 font-mono tabular-nums ${
                                  v < 0 && !isPercent ? 'text-destructive' : ''
                                } ${row.style === 'total' && v < 0 ? 'text-red-300' : ''}`}
                              >
                                {formatVal(v, isPercent)}
                              </td>
                            ))}
                            <td
                              className={`text-right px-3 py-1.5 font-mono tabular-nums font-semibold ${
                                row.style === 'total' ? 'bg-slate-950' : 'bg-muted/50'
                              } ${
                                row.style === 'result-positive' ? 'bg-emerald-200' : ''
                              } ${
                                row.style === 'result-negative' ? 'bg-red-200' : ''
                              } ${
                                row.total < 0 && !isPercent ? 'text-destructive' : ''
                              } ${
                                row.style === 'total' && row.total < 0 ? 'text-red-300' : ''
                              }`}
                            >
                              {formatVal(row.total, isPercent)}
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
