import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCombobox } from '@/components/SearchableCombobox';
import { CurrencyInput } from '@/components/CurrencyInput';
import { cn } from '@/lib/utils';
import {
  Plus, Pencil, Trash2, CalendarIcon, ArrowDownToLine, ArrowUpFromLine,
  ChevronUp, ChevronDown, Loader2, X, Search, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Types
interface Lancamento {
  id: number;
  data_lancamento: string;
  competencia: string;
  tipo: string;
  conta_id: string;
  cliente_id: string | null;
  num_processo: string | null;
  area_juridica: string | null;
  socio_id: string | null;
  centro_custo_id: string | null;
  descricao: string;
  valor_previsto: number | null;
  valor_realizado: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  num_documento: string | null;
  status: string;
  regime: string;
  parcela: string | null;
  observacoes: string | null;
  plano_contas?: { codigo: string; descricao: string; grupo: string; subgrupo: string | null; natureza: string | null; centro_custo_padrao: string | null } | null;
  clientes?: { nome: string } | null;
  socios?: { nome: string } | null;
  centros_custo?: { nome: string } | null;
}

interface PlanoContas {
  id: string;
  codigo: string;
  descricao: string;
  grupo: string;
  subgrupo: string | null;
  natureza: string | null;
  centro_custo_padrao: string | null;
  tipo: string;
}

interface Cliente { id: string; nome: string; }
interface Socio { id: string; nome: string; }
interface CentroCusto { id: string; codigo: string | null; nome: string; }
interface ContaBancaria { id: string; banco: string; agencia: string | null; conta: string | null; }

const STATUS_COLORS: Record<string, string> = {
  Pago: 'bg-[#DCFCE7] text-[#166534] border-[#bbf7d0]',
  Pendente: 'bg-[#FEF9C3] text-[#854D0E] border-[#fef08a]',
  'A vencer': 'bg-[#DBEAFE] text-[#1E40AF] border-[#bfdbfe]',
  Parcial: 'bg-orange-100 text-orange-700 border-orange-200',
  Cancelado: 'bg-[#F3F4F6] text-[#6B7280] border-[#e5e7eb]',
  Vencido: 'bg-[#FEE2E2] text-[#991B1B] border-[#fecaca]',
};

const AREAS_JURIDICAS = [
  'Cível', 'Trabalhista', 'Tributário', 'Empresarial', 'Família e Sucessões',
  'Criminal', 'Imobiliário', 'Consumidor', 'Previdenciário',
];

const FORMAS_PAGAMENTO = [
  'PIX', 'Transferência', 'Boleto', 'Cartão Crédito', 'Cartão Débito',
  'Cheque', 'Dinheiro', 'DAS', 'Débito Automático', 'DARF', 'Outros',
];

const STATUSES = ['Pago', 'Pendente', 'A vencer', 'Parcial', 'Vencido', 'Cancelado'];

const PAGE_SIZE = 25;

// Initial form state
function getInitialForm(): Record<string, any> {
  const today = new Date();
  return {
    data_lancamento: today,
    competencia: startOfMonth(today),
    tipo: 'R',
    conta_id: '',
    cliente_id: '',
    area_juridica: '',
    socio_id: '',
    centro_custo_id: '',
    descricao: '',
    valor_previsto: null as number | null,
    valor_realizado: null as number | null,
    data_pagamento: null as Date | null,
    forma_pagamento: '',
    conta_bancaria_id: '',
    num_documento: '',
    status: 'Pago',
    regime: 'Caixa',
    parcela: '',
    observacoes: '',
  };
}

export default function LancamentosPage() {
  const { selectedYear } = useYear();

  // Data
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date(selectedYear, 0, 1)));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date(selectedYear, 11, 31)));
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterConta, setFilterConta] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCentro, setFilterCentro] = useState('all');

  // Table
  const [sortField, setSortField] = useState<string>('data_lancamento');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Load reference data
  useEffect(() => {
    async function loadRefs() {
      const [pcRes, clRes, soRes, ccRes, cbRes] = await Promise.all([
        supabase.from('plano_contas').select('id, codigo, descricao, grupo, subgrupo, natureza, centro_custo_padrao, tipo').eq('ativo', true).order('codigo'),
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('centros_custo').select('id, codigo, nome').eq('ativo', true).order('codigo'),
        supabase.from('contas_bancarias').select('id, banco, agencia, conta').eq('ativa', true).order('banco'),
      ]);
      setPlanoContas(pcRes.data || []);
      setClientes(clRes.data || []);
      setSocios(soRes.data || []);
      setCentrosCusto(ccRes.data || []);
      setContasBancarias(cbRes.data || []);
    }
    loadRefs();
  }, []);

  // Load lancamentos
  const loadLancamentos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lancamentos')
      .select('*, plano_contas(codigo, descricao, grupo, subgrupo, natureza, centro_custo_padrao), clientes(nome), socios(nome), centros_custo(nome)')
      .gte('competencia', `${selectedYear}-01-01`)
      .lte('competencia', `${selectedYear}-12-31`)
      .order('data_lancamento', { ascending: false });

    const { data } = await query;
    setLancamentos((data as Lancamento[]) || []);
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { loadLancamentos(); }, [loadLancamentos]);

  // Reset filters on year change
  useEffect(() => {
    setDateFrom(new Date(selectedYear, 0, 1));
    setDateTo(new Date(selectedYear, 11, 31));
    setPage(0);
  }, [selectedYear]);

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...lancamentos];

    if (dateFrom) items = items.filter(l => new Date(l.data_lancamento) >= dateFrom);
    if (dateTo) items = items.filter(l => new Date(l.data_lancamento) <= dateTo);
    if (filterTipo !== 'all') items = items.filter(l => l.tipo === filterTipo);
    if (filterConta) items = items.filter(l => l.conta_id === filterConta);
    if (filterStatus !== 'all') items = items.filter(l => l.status === filterStatus);
    if (filterCentro !== 'all') items = items.filter(l => l.centro_custo_id === filterCentro);

    // Sort
    items.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'data_lancamento': valA = a.data_lancamento; valB = b.data_lancamento; break;
        case 'tipo': valA = a.tipo; valB = b.tipo; break;
        case 'conta': valA = a.plano_contas?.codigo || ''; valB = b.plano_contas?.codigo || ''; break;
        case 'cliente': valA = a.clientes?.nome || ''; valB = b.clientes?.nome || ''; break;
        case 'descricao': valA = a.descricao; valB = b.descricao; break;
        case 'valor_realizado': valA = a.valor_realizado; valB = b.valor_realizado; break;
        case 'status': valA = a.status; valB = b.status; break;
        default: valA = a.data_lancamento; valB = b.data_lancamento;
      }
      if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return items;
  }, [lancamentos, dateFrom, dateTo, filterTipo, filterConta, filterStatus, filterCentro, sortField, sortDir]);

  // Totals
  const totals = useMemo(() => {
    const rec = filtered.filter(l => l.tipo === 'R').reduce((s, l) => s + Number(l.valor_realizado), 0);
    const desp = filtered.filter(l => l.tipo === 'D').reduce((s, l) => s + Number(l.valor_realizado), 0);
    return { receitas: rec, despesas: desp, saldo: rec - desp };
  }, [filtered]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Sort handler
  function handleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  // Clear filters
  function clearFilters() {
    setDateFrom(new Date(selectedYear, 0, 1));
    setDateTo(new Date(selectedYear, 11, 31));
    setFilterTipo('all');
    setFilterConta('');
    setFilterStatus('all');
    setFilterCentro('all');
    setPage(0);
  }

  // Form handlers
  function openNew() {
    setEditingId(null);
    setForm(getInitialForm());
    setSheetOpen(true);
  }

  function openEdit(l: Lancamento) {
    setEditingId(l.id);
    setForm({
      data_lancamento: l.data_lancamento ? parseISO(l.data_lancamento) : new Date(),
      competencia: l.competencia ? parseISO(l.competencia) : startOfMonth(new Date()),
      tipo: l.tipo,
      conta_id: l.conta_id,
      cliente_id: l.cliente_id || '',
      area_juridica: l.area_juridica || '',
      socio_id: l.socio_id || '',
      centro_custo_id: l.centro_custo_id || '',
      descricao: l.descricao,
      valor_previsto: l.valor_previsto,
      valor_realizado: l.valor_realizado,
      data_pagamento: l.data_pagamento ? parseISO(l.data_pagamento) : null,
      forma_pagamento: l.forma_pagamento || '',
      conta_bancaria_id: l.conta_bancaria_id || '',
      num_documento: l.num_documento || '',
      status: l.status || 'Pago',
      regime: l.regime || 'Caixa',
      parcela: l.parcela || '',
      observacoes: l.observacoes || '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!form.valor_realizado && form.valor_realizado !== 0) {
      toast.error('Valor Realizado é obrigatório');
      return;
    }
    if (!form.conta_id) {
      toast.error('Selecione uma conta');
      return;
    }

    setSaving(true);
    const payload = {
      data_lancamento: format(form.data_lancamento, 'yyyy-MM-dd'),
      competencia: format(form.competencia, 'yyyy-MM-dd'),
      tipo: form.tipo,
      conta_id: form.conta_id,
      cliente_id: form.cliente_id || null,
      area_juridica: form.area_juridica || null,
      socio_id: form.socio_id || null,
      centro_custo_id: form.centro_custo_id || null,
      descricao: form.descricao.trim(),
      valor_previsto: form.valor_previsto,
      valor_realizado: form.valor_realizado,
      data_pagamento: form.data_pagamento ? format(form.data_pagamento, 'yyyy-MM-dd') : null,
      forma_pagamento: form.forma_pagamento || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      num_documento: form.num_documento || null,
      status: form.status,
      regime: form.regime,
      parcela: form.parcela || null,
      observacoes: form.observacoes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('lancamentos').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('lancamentos').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(editingId ? 'Lançamento atualizado!' : 'Lançamento criado!');
      setSheetOpen(false);
      loadLancamentos();
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('lancamentos').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir: ' + error.message);
    else { toast.success('Lançamento excluído!'); loadLancamentos(); }
    setDeleteId(null);
  }

  // Selected conta details
  const selectedConta = planoContas.find(p => p.id === form.conta_id);

  // When conta changes, auto-set centro_custo if available
  function handleContaChange(contaId: string) {
    const conta = planoContas.find(p => p.id === contaId);
    const newForm: any = { ...form, conta_id: contaId };
    if (conta?.centro_custo_padrao) {
      const cc = centrosCusto.find(c => c.nome === conta.centro_custo_padrao);
      if (cc) newForm.centro_custo_id = cc.id;
    }
    // Filter plano_contas by tipo
    if (conta) newForm.tipo = conta.tipo;
    setForm(newForm);
  }

  // Combobox options
  const contaOptions = useMemo(() =>
    planoContas
      .filter(p => filterTipo === 'all' || !form.tipo || p.tipo === form.tipo || true)
      .map(p => ({ value: p.id, label: `${p.codigo} - ${p.descricao}` })),
    [planoContas]
  );

  const contaFilterOptions = useMemo(() =>
    planoContas.map(p => ({ value: p.id, label: `${p.codigo} - ${p.descricao}` })),
    [planoContas]
  );

  const clienteOptions = useMemo(() =>
    clientes.map(c => ({ value: c.id, label: c.nome })),
    [clientes]
  );

  // DatePicker helper
  function DatePicker({ date, onSelect, placeholder = 'Selecione' }: { date: Date | null | undefined; onSelect: (d: Date | undefined) => void; placeholder?: string }) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date || undefined} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <DatePicker date={dateFrom} onSelect={setDateFrom} placeholder="Início" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <DatePicker date={dateTo} onSelect={setDateTo} placeholder="Fim" />
            </div>
            <div className="space-y-1 w-32">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="R">Receitas</SelectItem>
                  <SelectItem value="D">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-64">
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <SearchableCombobox
                options={contaFilterOptions}
                value={filterConta}
                onValueChange={setFilterConta}
                placeholder="Todas as contas"
                searchPlaceholder="Buscar conta..."
              />
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-44">
              <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
              <Select value={filterCentro} onValueChange={setFilterCentro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-3 w-3" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {[
                        { key: 'data_lancamento', label: 'Data' },
                        { key: 'tipo', label: 'Tipo' },
                        { key: 'conta', label: 'Conta' },
                        { key: 'cliente', label: 'Cliente' },
                        { key: 'descricao', label: 'Descrição' },
                        { key: 'valor_realizado', label: 'Valor' },
                        { key: 'status', label: 'Status' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                          onClick={() => handleSort(col.key)}
                        >
                          <span className="flex items-center gap-1">
                            {col.label} <SortIcon field={col.key} />
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((l) => (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(l.data_lancamento)}</td>
                        <td className="py-2.5 px-3">
                          <Badge className={cn('text-xs border', l.tipo === 'R' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20')}>
                            {l.tipo === 'R' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-xs text-muted-foreground">{l.plano_contas?.codigo}</span>{' '}
                          <span className="truncate">{(l.plano_contas?.descricao || '').slice(0, 30)}</span>
                        </td>
                        <td className="py-2.5 px-3">{l.clientes?.nome || '—'}</td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate">
                          {l.descricao}
                          {l.observacoes === 'Migrado da planilha' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="inline-block h-3.5 w-3.5 ml-1.5 text-muted-foreground/60 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>Migrado da planilha</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                        <td className={cn('py-2.5 px-3 text-right font-medium whitespace-nowrap', l.tipo === 'R' ? 'text-success' : 'text-destructive')}>
                          {formatCurrency(l.valor_realizado)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge className={cn('text-xs border', STATUS_COLORS[l.status] || '')}>{l.status}</Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(l.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paged.length === 0 && (
                      <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Nenhum lançamento encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer: totals + pagination */}
              <div className="border-t border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <span>Receitas: <span className="text-success">{formatCurrency(totals.receitas)}</span></span>
                  <span>Despesas: <span className="text-destructive">{formatCurrency(totals.despesas)}</span></span>
                  <span>Saldo: <span className={totals.saldo >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(totals.saldo)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{filtered.length} registros</span>
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span className="text-muted-foreground">{page + 1}/{totalPages || 1}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</SheetTitle>
            <SheetDescription>Preencha os dados do lançamento financeiro.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Data Lançamento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data Lançamento *</Label>
              <DatePicker date={form.data_lancamento} onSelect={(d) => setForm({ ...form, data_lancamento: d || new Date() })} />
            </div>

            {/* Competência */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Competência *</Label>
              <DatePicker date={form.competencia} onSelect={(d) => setForm({ ...form, competencia: d || startOfMonth(new Date()) })} />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: 'R' })}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    form.tipo === 'R' ? 'border-success bg-success/5' : 'border-border hover:border-success/50'
                  )}
                >
                  <ArrowDownToLine className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">Receita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: 'D' })}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    form.tipo === 'D' ? 'border-destructive bg-destructive/5' : 'border-border hover:border-destructive/50'
                  )}
                >
                  <ArrowUpFromLine className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">Despesa</span>
                </button>
              </div>
            </div>

            {/* Conta */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Conta *</Label>
              <SearchableCombobox
                options={contaOptions}
                value={form.conta_id}
                onValueChange={handleContaChange}
                placeholder="Selecione a conta..."
                searchPlaceholder="Buscar por código ou descrição..."
              />
            </div>

            {/* Readonly auto-fill fields */}
            {selectedConta && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Grupo</Label>
                  <Input value={selectedConta.grupo || ''} readOnly className="bg-muted/50 text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Subgrupo</Label>
                  <Input value={selectedConta.subgrupo || ''} readOnly className="bg-muted/50 text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Natureza</Label>
                  <Input value={selectedConta.natureza || ''} readOnly className="bg-muted/50 text-xs h-8" />
                </div>
              </div>
            )}

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cliente</Label>
              <SearchableCombobox
                options={clienteOptions}
                value={form.cliente_id}
                onValueChange={(v) => setForm({ ...form, cliente_id: v })}
                placeholder="Selecione o cliente (opcional)..."
                searchPlaceholder="Buscar cliente..."
              />
            </div>

            {/* Área Jurídica */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Área Jurídica</Label>
              <Select value={form.area_juridica} onValueChange={(v) => setForm({ ...form, area_juridica: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {AREAS_JURIDICAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Sócio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sócio Responsável</Label>
              <Select value={form.socio_id} onValueChange={(v) => setForm({ ...form, socio_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {socios.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Centro de Custo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Centro de Custo</Label>
              <Select value={form.centro_custo_id} onValueChange={(v) => setForm({ ...form, centro_custo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição / Histórico *</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do lançamento" />
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor Previsto</Label>
                <CurrencyInput value={form.valor_previsto} onChange={(v) => setForm({ ...form, valor_previsto: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor Realizado *</Label>
                <CurrencyInput value={form.valor_realizado} onChange={(v) => setForm({ ...form, valor_realizado: v })} />
              </div>
            </div>

            {/* Data Pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data Pagamento</Label>
              <DatePicker date={form.data_pagamento} onSelect={(d) => setForm({ ...form, data_pagamento: d || null })} placeholder="Selecione..." />
            </div>

            {/* Forma Pagamento + Conta Bancária */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Conta Bancária</Label>
                <Select value={form.conta_bancaria_id} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map(cb => (
                      <SelectItem key={cb.id} value={cb.id}>{cb.banco} {cb.agencia ? `Ag ${cb.agencia}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nº Documento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nº Documento / NF</Label>
              <Input value={form.num_documento} onChange={(e) => setForm({ ...form, num_documento: e.target.value })} placeholder="Número do documento" />
            </div>

            {/* Status + Regime */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Regime</Label>
                <Select value={form.regime} onValueChange={(v) => setForm({ ...form, regime: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caixa">Caixa</SelectItem>
                    <SelectItem value="Competência">Competência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parcela */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Parcela</Label>
              <Input value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} placeholder="Ex: 2/10" />
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} placeholder="Observações adicionais..." />
            </div>
          </div>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
