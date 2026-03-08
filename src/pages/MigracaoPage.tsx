import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  RefreshCw, Trash2, Database, Users, CalendarRange, CheckCircle2,
  Clock, XCircle, Loader2, FileSpreadsheet, Info,
} from 'lucide-react';

const TOTAL_LANCAMENTOS = 2286;
const TOTAL_CLIENTES = 18;

interface MigracaoAno {
  ano: number;
  qtd: number;
  receitas: number;
  despesas: number;
  resultado: number;
}

interface ContaTop {
  codigo: string;
  descricao: string;
  qtd: number;
  total: number;
}

export default function MigracaoPage() {
  const [totalMigrados, setTotalMigrados] = useState<number>(0);
  const [totalClientes, setTotalClientes] = useState<number>(0);
  const [porAno, setPorAno] = useState<MigracaoAno[]>([]);
  const [topContas, setTopContas] = useState<ContaTop[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [lancRes, cliRes, anoRes, topRes] = await Promise.all([
        supabase.from('lancamentos').select('*', { count: 'exact', head: true }).eq('observacoes', 'Migrado da planilha'),
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('observacoes', 'Importado da planilha'),
        (supabase.rpc as any)('verificar_migracao_por_ano'),
        supabase.from('lancamentos')
          .select('conta_id, valor_realizado, plano_contas(codigo, descricao)')
          .eq('observacoes', 'Migrado da planilha'),
      ]);

      setTotalMigrados(lancRes.count ?? 0);
      setTotalClientes(cliRes.count ?? 0);
      setPorAno((anoRes.data as MigracaoAno[]) ?? []);

      // Aggregate top contas client-side
      if (topRes.data) {
        const map = new Map<string, ContaTop>();
        for (const l of topRes.data as any[]) {
          const key = l.conta_id;
          const existing = map.get(key);
          if (existing) {
            existing.qtd++;
            existing.total += Number(l.valor_realizado);
          } else {
            map.set(key, {
              codigo: l.plano_contas?.codigo ?? '',
              descricao: l.plano_contas?.descricao ?? '',
              qtd: 1,
              total: Number(l.valor_realizado),
            });
          }
        }
        const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        setTopContas(sorted);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar status: ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleLimpar() {
    setDeleting(true);
    try {
      const { error: e1 } = await supabase.from('lancamentos').delete().eq('observacoes', 'Migrado da planilha');
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('clientes').delete().eq('observacoes', 'Importado da planilha');
      if (e2) throw e2;
      toast.success('Dados migrados removidos com sucesso!');
      await loadStatus();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  }

  const pctLanc = Math.min((totalMigrados / TOTAL_LANCAMENTOS) * 100, 100);
  const pctCli = Math.min((totalClientes / TOTAL_CLIENTES) * 100, 100);

  const statusLabel = totalMigrados >= TOTAL_LANCAMENTOS ? 'Completa' : totalMigrados > 0 ? 'Em andamento' : 'Não iniciada';
  const StatusIcon = totalMigrados >= TOTAL_LANCAMENTOS ? CheckCircle2 : totalMigrados > 0 ? Clock : XCircle;
  const statusColor = totalMigrados >= TOTAL_LANCAMENTOS
    ? 'bg-success/10 text-success border-success/20'
    : totalMigrados > 0
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-destructive/10 text-destructive border-destructive/20';

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Migração de Dados Históricos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Importação da planilha Excel para o sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStatus} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={totalMigrados === 0 || loading} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar Migração
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lançamentos Migrados</p>
                <p className="text-xl font-bold text-foreground">{totalMigrados.toLocaleString('pt-BR')} / {TOTAL_LANCAMENTOS.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <Progress value={pctLanc} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{pctLanc.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes Importados</p>
                <p className="text-xl font-bold text-foreground">{totalClientes} / {TOTAL_CLIENTES}</p>
              </div>
            </div>
            <Progress value={pctCli} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{pctCli.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted">
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={`text-xs border ${statusColor}`}>{statusLabel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/50">
                <CalendarRange className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="text-lg font-bold text-foreground">Jul/2023 — Abr/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verificação por Ano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verificação por Ano</CardTitle>
          <CardDescription>Dados agrupados por ano de competência</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : porAno.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado migrado ainda</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead className="text-right">Qtd Lançamentos</TableHead>
                  <TableHead className="text-right">Receitas (R$)</TableHead>
                  <TableHead className="text-right">Despesas (R$)</TableHead>
                  <TableHead className="text-right">Resultado (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAno.map(row => (
                  <TableRow key={row.ano}>
                    <TableCell className="font-medium">{row.ano}</TableCell>
                    <TableCell className="text-right">{Number(row.qtd).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(Number(row.receitas))}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(Number(row.despesas))}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(row.resultado) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(Number(row.resultado))}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{porAno.reduce((s, r) => s + Number(r.qtd), 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(porAno.reduce((s, r) => s + Number(r.receitas), 0))}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(porAno.reduce((s, r) => s + Number(r.despesas), 0))}</TableCell>
                  <TableCell className={`text-right ${porAno.reduce((s, r) => s + Number(r.resultado), 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(porAno.reduce((s, r) => s + Number(r.resultado), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top 10 Contas */}
      {topContas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Contas Utilizadas</CardTitle>
            <CardDescription>Contas com maior volume financeiro nos dados migrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContas.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                    <TableCell>{c.descricao}</TableCell>
                    <TableCell className="text-right">{c.qtd}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Instruções
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>Para executar a migração:</p>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>Acesse o painel de administração do banco de dados → Editor SQL</li>
            <li>Execute o arquivo SQL de migração na seguinte ordem:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Parte 1:</strong> Inserir clientes (18 registros)</li>
                <li><strong>Parte 2:</strong> Inserir lançamentos (2.286 registros em batches)</li>
                <li><strong>Parte 3:</strong> Vincular clientes aos lançamentos</li>
                <li><strong>Parte 4:</strong> Verificação</li>
              </ul>
            </li>
            <li>Volte a esta página e clique em <strong>"Atualizar Status"</strong> para confirmar</li>
          </ol>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar dados migrados?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai excluir TODOS os {totalMigrados.toLocaleString('pt-BR')} lançamentos migrados e {totalClientes} clientes importados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLimpar} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Sim, excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
