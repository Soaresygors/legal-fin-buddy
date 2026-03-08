import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, FileText, Loader2,
} from 'lucide-react';

// Column mapping from Financeiro_PB_Padronizado.xlsx
const COLUMN_MAP: Record<string, string> = {
  tipo: 'tipo',
  descricao_padronizada: 'descricao',
  valor_realizado: 'valor_realizado',
  competencia: 'competencia',
  data_pagamento: 'data_pagamento',
  conta_codigo: 'conta_codigo',
  centro_custo_codigo: 'centro_custo_codigo',
  forma_pagamento: 'forma_pagamento',
  status: 'status',
};

interface ParsedRow {
  tipo?: string;
  descricao?: string;
  valor_realizado?: number;
  competencia?: string;
  data_pagamento?: string;
  conta_codigo?: string;
  centro_custo_codigo?: string;
  forma_pagamento?: string;
  status?: string;
  [key: string]: any;
}

type ImportMode = 'no-duplicate' | 'add-all' | 'replace-all';

export default function ImportacaoPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Step 2
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('no-duplicate');

  // Step 3
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  // Step 4
  const [result, setResult] = useState({ imported: 0, skipped: 0, errors: 0 });

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
    } else {
      toast.error('Formato inválido. Aceito: .xlsx ou .csv');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  // Parse file on Step 2
  const parseFile = useCallback(async () => {
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Try to find "Lancamentos" sheet or use first
    const sheetName = workbook.SheetNames.find(
      name => name.toLowerCase().includes('lancamento')
    ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (jsonData.length === 0) {
      toast.error('Arquivo vazio ou sem dados válidos');
      return;
    }

    // Map columns
    const rawHeaders = Object.keys(jsonData[0]);
    setHeaders(rawHeaders);

    const mapped: ParsedRow[] = jsonData.map(row => {
      const mapped: ParsedRow = {};
      for (const [srcCol, destCol] of Object.entries(COLUMN_MAP)) {
        if (row[srcCol] !== undefined) {
          mapped[destCol] = row[srcCol];
        }
      }
      // Also keep unmapped columns
      for (const key of rawHeaders) {
        if (!COLUMN_MAP[key] && row[key] !== undefined && row[key] !== '') {
          mapped[key] = row[key];
        }
      }
      // Parse valor_realizado as number
      if (mapped.valor_realizado) {
        const val = String(mapped.valor_realizado).replace(/[^\d.,-]/g, '').replace(',', '.');
        mapped.valor_realizado = parseFloat(val) || 0;
      }
      return mapped;
    });

    setRows(mapped);
    setPreviewRows(mapped.slice(0, 20));
  }, [file]);

  useEffect(() => {
    if (step === 2 && file) {
      parseFile();
    }
  }, [step, file, parseFile]);

  // Step 3: Process import
  const processImport = useCallback(async () => {
    const totalRows = rows.length;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    if (importMode === 'replace-all') {
      // Delete existing records first
      await supabase.from('lancamentos').delete().neq('id', 0);
    }

    const batchSize = 50;
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const records = batch.map(row => ({
        tipo: row.tipo === 'Receita' || row.tipo === 'R' ? 'R' : 'D',
        descricao: row.descricao || 'Sem descrição',
        valor_realizado: Number(row.valor_realizado) || 0,
        competencia: row.competencia ? formatDateForDB(row.competencia) : new Date().toISOString().slice(0, 10),
        data_pagamento: row.data_pagamento ? formatDateForDB(row.data_pagamento) : null,
        data_lancamento: row.data_pagamento ? formatDateForDB(row.data_pagamento) : new Date().toISOString().slice(0, 10),
        forma_pagamento: row.forma_pagamento || null,
        status: row.status || 'Pago',
        observacoes: 'Importado via planilha',
      }));

      const validRecords = records.filter(r => r.descricao && r.valor_realizado > 0);

      if (importMode === 'no-duplicate') {
        // Check each record for duplicates
        for (const record of validRecords) {
          const { data: existing } = await supabase
            .from('lancamentos')
            .select('id')
            .eq('descricao', record.descricao)
            .eq('competencia', record.competencia)
            .eq('valor_realizado', record.valor_realizado)
            .limit(1);

          if (existing && existing.length > 0) {
            skipped++;
          } else {
        const { error } = await supabase.from('lancamentos').insert(record as any);
            if (error) errors++;
            else imported++;
          }
        }
      } else {
        const { error } = await supabase.from('lancamentos').insert(validRecords as any);
        if (error) errors += validRecords.length;
        else imported += validRecords.length;
      }

      skipped += batch.length - records.filter(r => r.descricao && r.valor_realizado > 0).length;

      const progressPct = Math.min(((i + batchSize) / totalRows) * 100, 100);
      setProgress(progressPct);
      setProcessedCount(Math.min(i + batchSize, totalRows));
    }

    setResult({ imported, skipped, errors });
    setStep(4);
  }, [rows, importMode]);

  useEffect(() => {
    if (step === 3) {
      processImport();
    }
  }, [step, processImport]);

  function formatDateForDB(value: any): string {
    if (!value) return new Date().toISOString().slice(0, 10);
    // Handle Excel date serial numbers
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    // Handle string dates
    const str = String(value);
    // dd/mm/yyyy
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}/.test(str)) return str.slice(0, 10);
    // mm/yyyy (competencia)
    const compMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
    if (compMatch) return `${compMatch[2]}-${compMatch[1].padStart(2, '0')}-01`;
    return str;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step
                  ? 'bg-[#1F3864] text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${s === step ? 'text-[#1F3864]' : 'text-muted-foreground'}`}>
              {['Upload', 'Preview', 'Processando', 'Resultado'][s - 1]}
            </span>
            {s < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#2E75B6] bg-[#D6E4F0]/30'
                  : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-[#2E75B6] hover:bg-[#D6E4F0]/10'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <>
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600 mb-3" />
                  <p className="text-lg font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Trocar arquivo
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium text-foreground">Arraste o arquivo .xlsx aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-3">Aceito: .xlsx, .csv</p>
                </>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button
                disabled={!file}
                onClick={() => setStep(2)}
                className="bg-[#1F3864] hover:bg-[#2E75B6] gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Preview & Mapping */}
      {step === 2 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1F3864]">Preview dos Dados</h3>
                <p className="text-sm text-muted-foreground">
                  {rows.length} registros encontrados no arquivo
                </p>
              </div>
              <Badge variant="secondary" className="bg-[#D6E4F0] text-[#1F3864]">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                {file?.name}
              </Badge>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border rounded-lg mb-6 max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                    {['tipo', 'descricao', 'valor_realizado', 'competencia', 'status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 px-3">
                        <Badge className={`text-[9px] ${row.tipo === 'Receita' || row.tipo === 'R' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.tipo}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-3 max-w-[200px] truncate">{row.descricao}</td>
                      <td className="py-1.5 px-3 font-mono">{row.valor_realizado}</td>
                      <td className="py-1.5 px-3">{row.competencia}</td>
                      <td className="py-1.5 px-3">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import mode */}
            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium text-[#1F3864]">Modo de importação:</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="no-duplicate" id="no-dup" />
                  <Label htmlFor="no-dup" className="cursor-pointer flex-1">
                    <span className="font-medium">Adicionar sem duplicar</span>
                    <Badge variant="secondary" className="ml-2 text-[9px] bg-[#D6E4F0] text-[#1F3864]">Recomendado</Badge>
                    <p className="text-xs text-muted-foreground">Ignora registros que já existem</p>
                  </Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="add-all" id="add-all" />
                  <Label htmlFor="add-all" className="cursor-pointer flex-1">
                    <span className="font-medium">Adicionar todos os registros</span>
                    <p className="text-xs text-muted-foreground">Pode gerar duplicatas</p>
                  </Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="replace-all" id="replace" />
                  <Label htmlFor="replace" className="cursor-pointer flex-1">
                    <span className="font-medium text-red-600">Substituir tudo</span>
                    <p className="text-xs text-muted-foreground">Apaga dados existentes e importa novos</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-[#1F3864] hover:bg-[#2E75B6] gap-2"
              >
                Importar {rows.length} registros <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Processing */}
      {step === 3 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-[#2E75B6] animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-[#1F3864] mb-2">Importando dados...</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Processando {processedCount} de {rows.length} registros...
            </p>
            <div className="max-w-md mx-auto">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{progress.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Result */}
      {step === 4 && (
        <Card className="rounded-xl shadow-sm border-green-200 bg-green-50/30">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-2xl font-bold text-green-800 mb-2">Importação concluída!</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Os dados foram processados com sucesso.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setRows([]);
                  setPreviewRows([]);
                  setProgress(0);
                  setProcessedCount(0);
                }}
              >
                Nova Importação
              </Button>
              <Button
                onClick={() => navigate('/lancamentos')}
                className="bg-[#1F3864] hover:bg-[#2E75B6] gap-2"
              >
                <FileText className="h-4 w-4" /> Ver Lançamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
