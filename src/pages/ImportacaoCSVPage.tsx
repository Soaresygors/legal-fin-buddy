import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { parseCSV } from '@/lib/csv-parser';
import {
  importSocios, importCentrosCusto, importContasBancarias,
  importPlanoContas, importClientes, importLancamentos,
  type ImportResult,
} from '@/lib/csv-importers';

const ENTITY_OPTIONS = [
  { value: 'socios', label: 'Sócios', ordem: 1 },
  { value: 'centros_custo', label: 'Centros de Custo', ordem: 2 },
  { value: 'contas_bancarias', label: 'Contas Bancárias', ordem: 3 },
  { value: 'plano_contas', label: 'Plano de Contas', ordem: 4 },
  { value: 'clientes', label: 'Clientes', ordem: 5 },
  { value: 'lancamentos', label: 'Lançamentos', ordem: 6 },
] as const;

type EntityType = typeof ENTITY_OPTIONS[number]['value'];

const importerMap: Record<EntityType, (rows: Record<string, string>[]) => Promise<ImportResult>> = {
  socios: importSocios,
  centros_custo: importCentrosCusto,
  contas_bancarias: importContasBancarias,
  plano_contas: importPlanoContas,
  clientes: importClientes,
  lancamentos: importLancamentos,
};

export default function ImportacaoCSVPage() {
  const [entityType, setEntityType] = useState<EntityType>('socios');
  const [file, setFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedEntity = ENTITY_OPTIONS.find(e => e.value === entityType)!;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const text = await f.text();
    setRawCsvText(text);
    const parsed = parseCSV(text);
    setRows(parsed);

    if (parsed.length === 0) {
      toast.error('Arquivo vazio ou formato inválido. Use ponto-e-vírgula (;) como separador.');
    } else {
      toast.success(`${parsed.length} linha(s) encontrada(s) no arquivo.`);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const importer = importerMap[entityType];
      const res = await importer(rows);
      setResult(res);

      if (res.errors.length === 0) {
        toast.success(`${res.success} registro(s) importado(s) com sucesso!`);
      } else if (res.success > 0) {
        toast.warning(`${res.success} importado(s), ${res.errors.length} erro(s).`);
      } else {
        toast.error(`Nenhum registro importado. ${res.errors.length} erro(s).`);
      }
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    }

    setImporting(false);
  }

  function handleReset() {
    setFile(null);
    setRows([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          Importação de CSV
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Faça upload das planilhas preenchidas para importar os dados no sistema
        </p>
      </div>

      {/* Ordem de importação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Ordem recomendada de importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ENTITY_OPTIONS.map((e) => (
              <Badge
                key={e.value}
                variant={e.value === entityType ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => { setEntityType(e.value); handleReset(); }}
              >
                {e.ordem}º {e.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Upload do Arquivo
          </CardTitle>
          <CardDescription>
            Selecione o tipo de dados e o arquivo CSV correspondente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de dados</label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); handleReset(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map(e => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.ordem}º — {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Arquivo CSV</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Pré-visualização: {rows.length} linha(s) · Colunas: {Object.keys(rows[0]).join(', ')}
              </p>
              <ScrollArea className="max-h-40">
                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                  {rows.slice(0, 5).map((row, i) => (
                    <div key={i} className="truncate">
                      {Object.values(row).join(' | ')}
                    </div>
                  ))}
                  {rows.length > 5 && <div className="text-muted-foreground/60">... e mais {rows.length - 5} linhas</div>}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={rows.length === 0 || importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importando...' : `Importar ${selectedEntity.label}`}
            </Button>
            {file && (
              <Button variant="outline" onClick={handleReset}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : result.success > 0 ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/20">{result.success} importado(s)</Badge>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20">{result.errors.length} erro(s)</Badge>
                </div>
              )}
            </div>

            <Progress value={(result.success / (result.success + result.errors.length)) * 100} className="h-2" />

            {result.errors.length > 0 && (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive font-mono">{err}</p>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
