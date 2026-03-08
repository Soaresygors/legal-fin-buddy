import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DRELine {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  separator?: boolean;
}

export default function DREPage() {
  const { selectedYear } = useYear();
  const [lines, setLines] = useState<DRELine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('lancamentos')
        .select('tipo, valor_realizado, plano_contas(codigo, grupo, descricao)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`);

      if (!data) { setLoading(false); return; }

      const byGroup: Record<string, number> = {};
      data.forEach((l: any) => {
        const g = l.plano_contas?.grupo || 'Outros';
        byGroup[g] = (byGroup[g] || 0) + Number(l.valor_realizado);
      });

      const receitas = byGroup['RECEITAS'] || 0;
      const deducoes = byGroup['DEDUÇÕES DA RECEITA'] || 0;
      const custosDir = byGroup['CUSTOS DIRETOS'] || 0;
      const pessoal = byGroup['PESSOAL'] || 0;
      const admin = byGroup['ADMINISTRATIVAS'] || 0;
      const comercial = byGroup['COMERCIAIS'] || 0;
      const financeiras = byGroup['FINANCEIRAS'] || 0;
      const impostos = byGroup['IMPOSTOS'] || 0;
      const distrib = byGroup['DISTRIBUIÇÃO'] || 0;
      const invest = byGroup['INVESTIMENTOS'] || 0;

      const recLiquida = receitas - deducoes;
      const lucroBruto = recLiquida - custosDir;
      const despOp = pessoal + admin + comercial;
      const ebitda = lucroBruto - despOp;
      const resFinanceiro = -financeiras;
      const lucroAntes = ebitda + resFinanceiro;
      const lucroLiquido = lucroAntes - impostos;

      setLines([
        { label: '(+) RECEITA BRUTA', value: receitas, bold: true },
        { label: '  Honorários e Reembolsos', value: receitas, indent: 1 },
        { label: '(-) DEDUÇÕES DA RECEITA', value: -deducoes, bold: true },
        { label: '  Impostos sobre Receita', value: -deducoes, indent: 1 },
        { label: '(=) RECEITA LÍQUIDA', value: recLiquida, bold: true, separator: true },
        { label: '(-) CUSTOS DIRETOS', value: -custosDir, bold: true },
        { label: '(=) LUCRO BRUTO', value: lucroBruto, bold: true, separator: true },
        { label: '(-) DESPESAS OPERACIONAIS', value: -(despOp), bold: true },
        { label: '  Pessoal', value: -pessoal, indent: 1 },
        { label: '  Administrativas', value: -admin, indent: 1 },
        { label: '  Comerciais', value: -comercial, indent: 1 },
        { label: '(=) EBITDA', value: ebitda, bold: true, separator: true },
        { label: '(+/-) RESULTADO FINANCEIRO', value: resFinanceiro },
        { label: '  Despesas Financeiras', value: -financeiras, indent: 1 },
        { label: '(=) LUCRO ANTES DOS IMPOSTOS', value: lucroAntes, bold: true, separator: true },
        { label: '(-) IMPOSTOS', value: -impostos },
        { label: '(=) LUCRO LÍQUIDO', value: lucroLiquido, bold: true, separator: true },
        { label: '(-) DISTRIBUIÇÕES', value: -distrib },
        { label: '(-) INVESTIMENTOS', value: -invest },
        { label: '(=) RESULTADO FINAL', value: lucroLiquido - distrib - invest, bold: true, separator: true },
      ]);
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DRE - Demonstrativo de Resultados {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="max-w-2xl">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`flex justify-between py-2 px-3 ${
                    line.separator ? 'border-t-2 border-border' : 'border-b border-border/30'
                  } ${line.bold ? 'font-semibold' : ''}`}
                  style={{ paddingLeft: line.indent ? `${line.indent * 24 + 12}px` : undefined }}
                >
                  <span className={line.indent ? 'text-muted-foreground text-sm' : ''}>{line.label}</span>
                  <span className={`font-mono ${line.value >= 0 ? '' : 'text-destructive'}`}>
                    {formatCurrency(line.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
