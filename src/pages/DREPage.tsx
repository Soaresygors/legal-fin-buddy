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

// Helper: sum values for exact code matches
function sumByCodes(
  grouped: Record<string, Record<number, number>>,
  codes: string[],
  month: number
): number {
  let sum = 0;
  for (const code of Object.keys(grouped)) {
    if (codes.includes(code)) {
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

function lineFromCodes(
  label: string,
  grouped: Record<string, Record<number, number>>,
  codes: string[],
  style: RowStyle = 'normal',
  indent?: number
): DRERow {
  const months = Array.from({ length: 12 }, (_, i) => sumByCodes(grouped, codes, i + 1));
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
      const honContratuais = lineFromCodes('Honorários Contratuais', grouped, ['1.1'], 'normal', 1);
      const honExito = lineFromCodes('Honorários de Êxito', grouped, ['1.2'], 'normal', 1);
      const honRecorrentes = lineFromCodes('Honorários Recorrentes', grouped, ['1.3'], 'normal', 1);
      const consultorias = lineFromCodes('Consultorias e Pareceres', grouped, ['1.4'], 'normal', 1);
      const arbitragem = lineFromCodes('Arbitragem/Mediação', grouped, ['1.5'], 'normal', 1);
      const recuperacao = lineFromCodes('Recuperação de Crédito', grouped, ['1.6'], 'normal', 1);
      const reembolsos = lineFromCodes('Reembolsos', grouped, ['1.7'], 'normal', 1);
      const recJudiciais = lineFromCodes('Receitas Judiciais Diversas', grouped, ['1.8'], 'normal', 1);
      const outrasRec = lineFromCodes('Outras Receitas', grouped, ['1.9'], 'normal', 1);
      const rendaPatrimonial = lineFromCodes('Renda Patrimonial', grouped, ['1.10'], 'normal', 1);
      const recBrutaMonths = sumRows(honContratuais, honExito, honRecorrentes, consultorias, arbitragem, recuperacao, reembolsos, recJudiciais, outrasRec, rendaPatrimonial);
      const subtRecBruta = makeRow('SUBTOTAL RECEITA BRUTA', recBrutaMonths, 'subtotal');

      // 2. DEDUÇÕES
      const iss = lineFromCodes('ISS', grouped, ['2.1'], 'normal', 1);
      const pis = lineFromCodes('PIS', grouped, ['2.2'], 'normal', 1);
      const cofins = lineFromCodes('COFINS', grouped, ['2.3'], 'normal', 1);
      const irrf = lineFromCodes('IRRF', grouped, ['2.4'], 'normal', 1);
      const descontos = lineFromCodes('Descontos Concedidos', grouped, ['2.5'], 'normal', 1);
      const outrasDeducoes = lineFromCodes('Outras Deduções', grouped, ['2.6'], 'normal', 1);
      const deducoesMonths = sumRows(iss, pis, cofins, irrf, descontos, outrasDeducoes);
      const subtDeducoes = makeRow('SUBTOTAL DEDUÇÕES', deducoesMonths, 'subtotal');

      // 3. RECEITA LÍQUIDA
      const recLiqMonths = subtractRows(recBrutaMonths, deducoesMonths);
      const totalRecLiq = makeRow('RECEITA LÍQUIDA', recLiqMonths, 'total');

      // 4. CUSTOS DIRETOS
      const custas = lineFromCodes('Custas Processuais', grouped, ['3.1'], 'normal', 1);
      const taxas = lineFromCodes('Taxas', grouped, ['3.2'], 'normal', 1);
      const pericias = lineFromCodes('Perícias', grouped, ['3.3'], 'normal', 1);
      const diligencias = lineFromCodes('Diligências', grouped, ['3.4'], 'normal', 1);
      const correspondentes = lineFromCodes('Correspondentes', grouped, ['3.5'], 'normal', 1);
      const terceirizados = lineFromCodes('Terceirizados', grouped, ['3.6'], 'normal', 1);
      const comissoes = lineFromCodes('Comissões', grouped, ['3.7'], 'normal', 1);
      const custDirMonths = sumRows(custas, taxas, pericias, diligencias, correspondentes, terceirizados, comissoes);
      const subtCustDir = makeRow('SUBTOTAL CUSTOS DIRETOS', custDirMonths, 'subtotal');

      // 5. MARGEM DE CONTRIBUIÇÃO
      const margemContribMonths = subtractRows(recLiqMonths, custDirMonths);
      const totalMargemContrib = makeRow('MARGEM DE CONTRIBUIÇÃO', margemContribMonths, 'total');
      const pctMargemContrib = percentRow('% Margem de Contribuição', margemContribMonths, recBrutaMonths);

      // 6. DESPESAS OPERACIONAIS
      // 6.1 Pessoal
      const salarios = lineFromCodes('Salários e Encargos', grouped, ['4.1'], 'normal', 2);
      const decTerceiro = lineFromCodes('13º Salário', grouped, ['4.2'], 'normal', 2);
      const ferias = lineFromCodes('Férias e Adicional', grouped, ['4.3'], 'normal', 2);
      const fgts = lineFromCodes('FGTS', grouped, ['4.4'], 'normal', 2);
      const inss = lineFromCodes('INSS Patronal', grouped, ['4.5'], 'normal', 2);
      const valeTransporte = lineFromCodes('Vale Transporte', grouped, ['4.6'], 'normal', 2);
      const valeRefeicao = lineFromCodes('Vale Refeição', grouped, ['4.7'], 'normal', 2);
      const planoSaude = lineFromCodes('Plano de Saúde', grouped, ['4.8'], 'normal', 2);
      const estagiarios = lineFromCodes('Estagiários', grouped, ['4.9'], 'normal', 2);
      const rescisoes = lineFromCodes('Rescisões', grouped, ['4.10'], 'normal', 2);
      const proLabore = lineFromCodes('Pró-labore', grouped, ['4.11'], 'normal', 2);
      const pessoalMonths = sumRows(salarios, decTerceiro, ferias, fgts, inss, valeTransporte, valeRefeicao, planoSaude, estagiarios, rescisoes, proLabore);
      const subtPessoal = makeRow('Subtotal Pessoal', pessoalMonths, 'subtotal');

      // 6.2 Administrativas
      const aluguel = lineFromCodes('Aluguel', grouped, ['5.1'], 'normal', 2);
      const condominio = lineFromCodes('Condomínio', grouped, ['5.2'], 'normal', 2);
      const iptu = lineFromCodes('IPTU', grouped, ['5.3'], 'normal', 2);
      const energia = lineFromCodes('Energia', grouped, ['5.4'], 'normal', 2);
      const agua = lineFromCodes('Água', grouped, ['5.5'], 'normal', 2);
      const telefone = lineFromCodes('Telefone/Internet', grouped, ['5.6'], 'normal', 2);
      const software = lineFromCodes('Software Jurídico', grouped, ['5.7'], 'normal', 2);
      const equipamentos = lineFromCodes('Equipamentos de TI', grouped, ['5.8'], 'normal', 2);
      const correios = lineFromCodes('Correios/Cartório', grouped, ['5.9'], 'normal', 2);
      const material = lineFromCodes('Material de Escritório', grouped, ['5.10'], 'normal', 2);
      const limpezaCopa = lineFromCodes('Material Limpeza/Copa', grouped, ['5.11'], 'normal', 2);
      const contabilidade = lineFromCodes('Contabilidade', grouped, ['5.12'], 'normal', 2);
      const limpezaManut = lineFromCodes('Limpeza/Manutenção', grouped, ['5.13'], 'normal', 2);
      const seguros = lineFromCodes('Seguros', grouped, ['5.14'], 'normal', 2);
      const viagens = lineFromCodes('Viagens/Hospedagem', grouped, ['5.15', '5.16', '5.17'], 'normal', 2);
      const adminMonths = sumRows(aluguel, condominio, iptu, energia, agua, telefone, software, equipamentos, correios, material, limpezaCopa, contabilidade, limpezaManut, seguros, viagens);
      const subtAdmin = makeRow('Subtotal Administrativas', adminMonths, 'subtotal');

      // 6.3 Comerciais
      const marketing = lineFromCodes('Marketing', grouped, ['6.1'], 'normal', 2);
      const siteRedes = lineFromCodes('Site/Redes Sociais', grouped, ['6.2'], 'normal', 2);
      const eventos = lineFromCodes('Eventos', grouped, ['6.3'], 'normal', 2);
      const cursos = lineFromCodes('Cursos e Capacitação', grouped, ['6.4'], 'normal', 2);
      const assinaturas = lineFromCodes('Assinaturas', grouped, ['6.5'], 'normal', 2);
      const comercialMonths = sumRows(marketing, siteRedes, eventos, cursos, assinaturas);
      const subtComercial = makeRow('Subtotal Comerciais', comercialMonths, 'subtotal');

      const totalDespOpMonths = sumRows(subtPessoal, subtAdmin, subtComercial);
      const totalDespOp = makeRow('TOTAL DESPESAS OPERACIONAIS', totalDespOpMonths, 'subtotal');

      // 7. EBITDA
      const ebitdaMonths = subtractRows(margemContribMonths, totalDespOpMonths);
      const totalEbitda = makeRow('EBITDA', ebitdaMonths, 'total');
      const pctMargemOp = percentRow('% Margem Operacional', ebitdaMonths, recBrutaMonths);

      // 8. DESPESAS FINANCEIRAS
      const tarifas = lineFromCodes('Tarifas Bancárias', grouped, ['7.1'], 'normal', 1);
      const juros = lineFromCodes('Juros sobre Empréstimos', grouped, ['7.2'], 'normal', 1);
      const iof = lineFromCodes('IOF', grouped, ['7.3'], 'normal', 1);
      const multas = lineFromCodes('Multas', grouped, ['7.4'], 'normal', 1);
      const taxasCartao = lineFromCodes('Taxas de Cartão', grouped, ['7.5'], 'normal', 1);
      const recFinanceiras = lineFromCodes('(-) Receitas Financeiras', grouped, ['1.11'], 'normal', 1);
      const despFinMonths = subtractRows(sumRows(tarifas, juros, iof, multas, taxasCartao), recFinanceiras.months);
      const subtDespFin = makeRow('SUBTOTAL DESPESAS FINANCEIRAS', despFinMonths, 'subtotal');

      // 9. RESULTADO ANTES DOS IMPOSTOS
      const resAntesImpMonths = subtractRows(ebitdaMonths, despFinMonths);
      const totalResAntesImp = makeRow('RESULTADO ANTES DOS IMPOSTOS', resAntesImpMonths, 'total');

      // 10. IMPOSTOS SOBRE LUCRO
      const irpj = lineFromCodes('IRPJ/DARF', grouped, ['8.1'], 'normal', 1);
      const csll = lineFromCodes('CSLL', grouped, ['8.2'], 'normal', 1);
      const simples = lineFromCodes('Simples Nacional', grouped, ['8.3'], 'normal', 1);
      const impostosMonths = sumRows(irpj, csll, simples);
      const subtImpostos = makeRow('SUBTOTAL IMPOSTOS', impostosMonths, 'subtotal');

      // 11. RESULTADO LÍQUIDO
      const resLiqMonths = subtractRows(resAntesImpMonths, impostosMonths);
      const resLiqTotal = sumAllMonths(resLiqMonths);
      const totalResLiq = makeRow('RESULTADO LÍQUIDO', resLiqMonths, resLiqTotal >= 0 ? 'result-positive' : 'result-negative');
      const pctMargemLiq = percentRow('% Margem Líquida', resLiqMonths, recBrutaMonths);

      // 12. DISTRIBUIÇÃO DE LUCROS
      const distLucros = lineFromCodes('Distribuição de Lucros', grouped, ['9.1'], 'normal', 1);
      const reservas = lineFromCodes('Reservas', grouped, ['9.2'], 'normal', 1);
      const distMonths = sumRows(distLucros, reservas);
      const subtDist = makeRow('SUBTOTAL DISTRIBUIÇÃO', distMonths, 'subtotal');

      // 13. INVESTIMENTOS
      const moveisEquip = lineFromCodes('Móveis e Equipamentos', grouped, ['10.1'], 'normal', 1);
      const reformas = lineFromCodes('Reforma e Instalações', grouped, ['10.2'], 'normal', 1);
      const techInvest = lineFromCodes('Investimentos em Tecnologia', grouped, ['10.3'], 'normal', 1);
      const investMonths = sumRows(moveisEquip, reformas, techInvest);
      const subtInvest = makeRow('SUBTOTAL INVESTIMENTOS', investMonths, 'subtotal');

      // SALDO FINAL (Resultado Líquido - Distribuição - Investimentos)
      const saldoFinalMonths = subtractRows(subtractRows(resLiqMonths, distMonths), investMonths);
      const saldoFinalTotal = sumAllMonths(saldoFinalMonths);
      const totalSaldoFinal = makeRow('SALDO FINAL', saldoFinalMonths, saldoFinalTotal >= 0 ? 'result-positive' : 'result-negative');

      setRows([
        makeRow('1. RECEITA BRUTA', [], 'section'),
        honContratuais, honExito, honRecorrentes, consultorias, arbitragem, recuperacao, reembolsos, recJudiciais, outrasRec, rendaPatrimonial,
        subtRecBruta,

        makeRow('2. DEDUÇÕES DA RECEITA', [], 'section'),
        iss, pis, cofins, irrf, descontos, outrasDeducoes,
        subtDeducoes,

        totalRecLiq,

        makeRow('4. CUSTOS DIRETOS', [], 'section'),
        custas, taxas, pericias, diligencias, correspondentes, terceirizados, comissoes,
        subtCustDir,

        totalMargemContrib,
        pctMargemContrib,

        makeRow('6. DESPESAS OPERACIONAIS', [], 'section'),
        makeRow('6.1 Pessoal', [], 'section'),
        salarios, decTerceiro, ferias, fgts, inss, valeTransporte, valeRefeicao, planoSaude, estagiarios, rescisoes, proLabore,
        subtPessoal,

        makeRow('6.2 Administrativas', [], 'section'),
        aluguel, condominio, iptu, energia, agua, telefone, software, equipamentos, correios, material, limpezaCopa, contabilidade, limpezaManut, seguros, viagens,
        subtAdmin,

        makeRow('6.3 Comerciais', [], 'section'),
        marketing, siteRedes, eventos, cursos, assinaturas,
        subtComercial,

        totalDespOp,

        totalEbitda,
        pctMargemOp,

        makeRow('8. DESPESAS FINANCEIRAS', [], 'section'),
        tarifas, juros, iof, multas, taxasCartao, recFinanceiras,
        subtDespFin,

        totalResAntesImp,

        makeRow('10. IMPOSTOS SOBRE LUCRO', [], 'section'),
        irpj, csll, simples,
        subtImpostos,

        totalResLiq,
        pctMargemLiq,

        makeRow('12. DISTRIBUIÇÃO DE LUCROS', [], 'section'),
        distLucros, reservas,
        subtDist,

        makeRow('13. INVESTIMENTOS', [], 'section'),
        moveisEquip, reformas, techInvest,
        subtInvest,

        totalSaldoFinal,
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
