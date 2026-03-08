import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface TemplateInfo {
  id: string;
  nome: string;
  descricao: string;
  colunas: { nome: string; obrigatoria: boolean; exemplo: string; obs?: string }[];
  ordemImportacao: number;
}

const templates: TemplateInfo[] = [
  {
    id: 'socios',
    nome: 'Sócios',
    descricao: 'Cadastro dos sócios do escritório',
    ordemImportacao: 1,
    colunas: [
      { nome: 'nome', obrigatoria: true, exemplo: 'João Silva' },
      { nome: 'oab', obrigatoria: false, exemplo: 'OAB/SP 123456' },
      { nome: 'area_principal', obrigatoria: false, exemplo: 'Cível' },
      { nome: 'participacao', obrigatoria: false, exemplo: '50', obs: 'Percentual (0-100)' },
      { nome: 'ativo', obrigatoria: false, exemplo: 'true', obs: 'true ou false' },
    ],
  },
  {
    id: 'centros_custo',
    nome: 'Centros de Custo',
    descricao: 'Centros de custo para classificação',
    ordemImportacao: 2,
    colunas: [
      { nome: 'codigo', obrigatoria: false, exemplo: 'CC001' },
      { nome: 'nome', obrigatoria: true, exemplo: 'Administrativo' },
      { nome: 'descricao', obrigatoria: false, exemplo: 'Custos administrativos gerais' },
      { nome: 'responsavel', obrigatoria: false, exemplo: 'Maria Santos' },
      { nome: 'ativo', obrigatoria: false, exemplo: 'true' },
    ],
  },
  {
    id: 'contas_bancarias',
    nome: 'Contas Bancárias',
    descricao: 'Contas bancárias do escritório',
    ordemImportacao: 3,
    colunas: [
      { nome: 'banco', obrigatoria: true, exemplo: 'Banco do Brasil' },
      { nome: 'agencia', obrigatoria: false, exemplo: '1234-5' },
      { nome: 'conta', obrigatoria: false, exemplo: '12345-6' },
      { nome: 'tipo', obrigatoria: false, exemplo: 'Corrente', obs: 'Corrente, Poupança, etc.' },
      { nome: 'saldo_inicial', obrigatoria: false, exemplo: '10000.00' },
      { nome: 'ativa', obrigatoria: false, exemplo: 'true' },
    ],
  },
  {
    id: 'plano_contas',
    nome: 'Plano de Contas',
    descricao: 'Plano de contas contábil (receitas e despesas)',
    ordemImportacao: 4,
    colunas: [
      { nome: 'codigo', obrigatoria: true, exemplo: '1.1' },
      { nome: 'descricao', obrigatoria: true, exemplo: 'Honorários Contratuais' },
      { nome: 'tipo', obrigatoria: true, exemplo: 'R', obs: 'R = Receita, D = Despesa' },
      { nome: 'grupo', obrigatoria: true, exemplo: 'Receitas Operacionais' },
      { nome: 'subgrupo', obrigatoria: false, exemplo: 'Honorários' },
      { nome: 'natureza', obrigatoria: false, exemplo: 'Operacional' },
      { nome: 'ativo', obrigatoria: false, exemplo: 'true' },
    ],
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Cadastro de clientes do escritório',
    ordemImportacao: 5,
    colunas: [
      { nome: 'nome', obrigatoria: true, exemplo: 'Empresa ABC Ltda' },
      { nome: 'cpf_cnpj', obrigatoria: false, exemplo: '12.345.678/0001-99' },
      { nome: 'tipo_pf_pj', obrigatoria: false, exemplo: 'PJ', obs: 'PF ou PJ' },
      { nome: 'email', obrigatoria: false, exemplo: 'contato@empresa.com' },
      { nome: 'telefone', obrigatoria: false, exemplo: '(11) 99999-9999' },
      { nome: 'area_juridica', obrigatoria: false, exemplo: 'Trabalhista' },
      { nome: 'status', obrigatoria: false, exemplo: 'Ativo', obs: 'Ativo ou Inativo' },
      { nome: 'observacoes', obrigatoria: false, exemplo: '' },
    ],
  },
  {
    id: 'lancamentos',
    nome: 'Lançamentos',
    descricao: 'Lançamentos financeiros (receitas e despesas)',
    ordemImportacao: 6,
    colunas: [
      { nome: 'tipo', obrigatoria: true, exemplo: 'R', obs: 'R = Receita, D = Despesa' },
      { nome: 'descricao', obrigatoria: true, exemplo: 'Honorários cliente ABC - Jan/2025' },
      { nome: 'valor_realizado', obrigatoria: true, exemplo: '5000.00' },
      { nome: 'valor_previsto', obrigatoria: false, exemplo: '5000.00' },
      { nome: 'competencia', obrigatoria: true, exemplo: '2025-01-15', obs: 'Formato AAAA-MM-DD' },
      { nome: 'data_lancamento', obrigatoria: true, exemplo: '2025-01-15', obs: 'Formato AAAA-MM-DD' },
      { nome: 'data_pagamento', obrigatoria: false, exemplo: '2025-01-20' },
      { nome: 'conta_codigo', obrigatoria: true, exemplo: '1.1', obs: 'Código do plano de contas' },
      { nome: 'cliente_nome', obrigatoria: false, exemplo: 'Empresa ABC Ltda', obs: 'Nome exato do cliente cadastrado' },
      { nome: 'centro_custo_codigo', obrigatoria: false, exemplo: 'CC001' },
      { nome: 'socio_nome', obrigatoria: false, exemplo: 'João Silva', obs: 'Nome exato do sócio' },
      { nome: 'forma_pagamento', obrigatoria: false, exemplo: 'PIX' },
      { nome: 'num_documento', obrigatoria: false, exemplo: 'NF-001' },
      { nome: 'status', obrigatoria: false, exemplo: 'Pago', obs: 'Pago, Pendente, Cancelado' },
      { nome: 'observacoes', obrigatoria: false, exemplo: '' },
    ],
  },
];

function generateCSV(template: TemplateInfo): string {
  const header = template.colunas.map(c => c.nome).join(';');
  const example = template.colunas.map(c => c.exemplo).join(';');
  return `${header}\n${example}\n`;
}

function downloadCSV(template: TemplateInfo) {
  const csv = generateCSV(template);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modelo_${template.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAll() {
  templates.forEach(t => downloadCSV(t));
}

export default function PlanilhasModeloPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Planilhas Modelo para Importação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Baixe os modelos CSV, preencha e envie para importação no sistema
          </p>
        </div>
        <Button onClick={downloadAll} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar Todas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Instruções de Preenchimento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Baixe os modelos CSV na <strong>ordem indicada</strong> (sócios → centros de custo → contas bancárias → plano de contas → clientes → lançamentos).</p>
          <p>2. Preencha cada planilha usando <strong>ponto-e-vírgula (;)</strong> como separador.</p>
          <p>3. Valores numéricos devem usar <strong>ponto</strong> como separador decimal (ex: 5000.00).</p>
          <p>4. Datas no formato <strong>AAAA-MM-DD</strong> (ex: 2025-01-15).</p>
          <p>5. Na planilha de lançamentos, use os <strong>nomes/códigos exatos</strong> cadastrados nas demais planilhas.</p>
          <p>6. A primeira linha de cada modelo contém um <strong>exemplo</strong> — substitua pelos seus dados reais.</p>
        </CardContent>
      </Card>

      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{t.ordemImportacao}º</Badge>
                {t.nome}
              </CardTitle>
              <CardDescription>{t.descricao}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(t)} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coluna</TableHead>
                  <TableHead className="text-center">Obrigatória</TableHead>
                  <TableHead>Exemplo</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.colunas.map((col) => (
                  <TableRow key={col.nome}>
                    <TableCell className="font-mono text-xs">{col.nome}</TableCell>
                    <TableCell className="text-center">
                      {col.obrigatoria ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{col.exemplo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{col.obs || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
