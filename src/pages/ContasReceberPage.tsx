import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCombobox } from '@/components/SearchableCombobox';
import { CurrencyInput } from '@/components/CurrencyInput';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowDownToLine, CalendarIcon, FileText } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['Pendente', 'Recebido', 'Parcial', 'Vencido', 'Cancelado', 'Protestado'];
const TIPO_HONORARIO = ['Contratual', 'Êxito', 'Recorrente', 'Consultoria', 'Parecer', 'Mediação', 'Reembolso', 'Outros'];
const AREAS = ['Cível', 'Trabalhista', 'Tributário', 'Empresarial', 'Família e Sucessões', 'Criminal', 'Imobiliário', 'Consumidor', 'Previdenciário'];
const FORMAS_PAG = ['PIX', 'Transferência', 'Boleto', 'Cartão Crédito', 'Cartão Débito', 'Cheque', 'Dinheiro', 'Outros'];
const PAGE_SIZE = 25;

const statusBadge: Record<string, string> = {
  Pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Recebido: 'bg-green-100 text-green-700 border-green-200',
  Vencido: 'bg-red-100 text-red-700 border-red-200',
  Parcial: 'bg-orange-100 text-orange-700 border-orange-200',
  Cancelado: 'bg-muted text-muted-foreground',
  Protestado: 'bg-purple-100 text-purple-700 border-purple-200',
};

function DatePicker({ value, onChange, placeholder = 'Selecione data' }: { value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

const emptyForm = {
  data_emissao: undefined as Date | undefined,
  data_vencimento: undefined as Date | undefined,
  competencia: undefined as Date | undefined,
  cliente_id: '',
  num_processo: '',
  area_juridica: '',
  tipo_honorario: '',
  descricao: '',
  valor_original: null as number | null,
  juros_multa: 0 as number | null,
  forma_pagamento: '',
  conta_bancaria_id: '',
  nf_recibo: '',
  status: 'Pendente',
  socio_id: '',
};

export default function ContasReceberPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();

  // Pagination & sort
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('data_vencimento');
  const [sortAsc, setSortAsc] = useState(true);

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Baixar
  const [baixarOpen, setBaixarOpen] = useState(false);
  const [baixarConta, setBaixarConta] = useState<any>(null);
  const [baixarValor, setBaixarValor] = useState<number | null>(null);
  const [baixarData, setBaixarData] = useState<Date | undefined>(new Date());
  const [baixarForma, setBaixarForma] = useState('');
  const [baixarContaBancaria, setBaixarContaBancaria] = useState('');

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    const [cRes, clRes, sRes, cbRes] = await Promise.all([
      supabase.from('contas_receber').select('*, clientes(nome), socios(nome)').order('data_vencimento', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('contas_bancarias').select('id, banco, conta').eq('ativa', true),
    ]);
    setContas(cRes.data || []);
    setClientes(clRes.data || []);
    setSocios(sRes.data || []);
    setContasBancarias(cbRes.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const clienteOptions = useMemo(() => clientes.map(c => ({ value: c.id, label: c.nome })), [clientes]);
  const contaBancariaOptions = useMemo(() => contasBancarias.map(c => ({ value: c.id, label: `${c.banco} - ${c.conta || ''}` })), [contasBancarias]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let list = [...contas];
    if (filterStatus !== 'Todos') list = list.filter(c => c.status === filterStatus);
    if (filterCliente) list = list.filter(c => c.cliente_id === filterCliente);
    if (filterDateFrom) list = list.filter(c => c.data_vencimento >= format(filterDateFrom, 'yyyy-MM-dd'));
    if (filterDateTo) list = list.filter(c => c.data_vencimento <= format(filterDateTo, 'yyyy-MM-dd'));

    list.sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [contas, filterStatus, filterCliente, filterDateFrom, filterDateTo, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalPendente = filtered.filter(c => c.status === 'Pendente' || c.status === 'Parcial').reduce((s, c) => s + Number(c.valor_original) + Number(c.juros_multa || 0) - Number(c.valor_recebido || 0), 0);
  const totalRecebido = filtered.filter(c => c.status === 'Recebido').reduce((s, c) => s + Number(c.valor_recebido || 0), 0);
  const totalVencido = filtered.filter(c => c.status === 'Vencido').reduce((s, c) => s + Number(c.valor_original) + Number(c.juros_multa || 0) - Number(c.valor_recebido || 0), 0);

  function handleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSheetOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({
      data_emissao: c.data_emissao ? parseISO(c.data_emissao) : undefined,
      data_vencimento: c.data_vencimento ? parseISO(c.data_vencimento) : undefined,
      competencia: c.competencia ? parseISO(c.competencia) : undefined,
      cliente_id: c.cliente_id || '',
      num_processo: c.num_processo || '',
      area_juridica: c.area_juridica || '',
      tipo_honorario: c.tipo_honorario || '',
      descricao: c.descricao || '',
      valor_original: Number(c.valor_original) || null,
      juros_multa: Number(c.juros_multa) || 0,
      forma_pagamento: c.forma_pagamento || '',
      conta_bancaria_id: c.conta_bancaria_id || '',
      nf_recibo: c.nf_recibo || '',
      status: c.status || 'Pendente',
      socio_id: c.socio_id || '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.data_vencimento || !form.descricao || !form.valor_original) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setSaving(true);
    const payload: any = {
      data_emissao: form.data_emissao ? format(form.data_emissao, 'yyyy-MM-dd') : null,
      data_vencimento: format(form.data_vencimento, 'yyyy-MM-dd'),
      competencia: form.competencia ? format(form.competencia, 'yyyy-MM-dd') : null,
      cliente_id: form.cliente_id || null,
      num_processo: form.num_processo || null,
      area_juridica: form.area_juridica || null,
      tipo_honorario: form.tipo_honorario || null,
      descricao: form.descricao,
      valor_original: form.valor_original,
      juros_multa: form.juros_multa || 0,
      forma_pagamento: form.forma_pagamento || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      nf_recibo: form.nf_recibo || null,
      status: form.status,
      socio_id: form.socio_id || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('contas_receber').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Título atualizado');
      } else {
        const { error } = await supabase.from('contas_receber').insert(payload);
        if (error) throw error;
        toast.success('Título criado');
      }
      setSheetOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('contas_receber').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Título excluído');
      setDeleteId(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  }

  function openBaixar(c: any) {
    const saldo = Number(c.valor_original) + Number(c.juros_multa || 0) - Number(c.valor_recebido || 0);
    setBaixarConta(c);
    setBaixarValor(saldo);
    setBaixarData(new Date());
    setBaixarForma('');
    setBaixarContaBancaria('');
    setBaixarOpen(true);
  }

  async function handleBaixar() {
    if (!baixarConta || !baixarValor) return;
    const novoRecebido = Number(baixarConta.valor_recebido || 0) + baixarValor;
    const total = Number(baixarConta.valor_original) + Number(baixarConta.juros_multa || 0);
    const novoStatus = novoRecebido >= total ? 'Recebido' : 'Parcial';

    try {
      const { error } = await supabase.from('contas_receber').update({
        valor_recebido: novoRecebido,
        data_recebimento: baixarData ? format(baixarData, 'yyyy-MM-dd') : null,
        forma_pagamento: baixarForma || null,
        conta_bancaria_id: baixarContaBancaria || null,
        status: novoStatus,
      }).eq('id', baixarConta.id);
      if (error) throw error;
      toast.success(`Baixa realizada — ${novoStatus}`);
      setBaixarOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Erro na baixa');
    }
  }

  function diasAtraso(c: any): string {
    if (c.status === 'Recebido' || c.status === 'Cancelado') return '—';
    const venc = parseISO(c.data_vencimento);
    const hoje = new Date();
    if (venc >= hoje) return '—';
    return `${differenceInDays(hoje, venc)}d`;
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Label className="text-xs mb-1 block">Cliente</Label>
              <SearchableCombobox options={[{ value: '', label: 'Todos' }, ...clienteOptions]} value={filterCliente} onValueChange={setFilterCliente} placeholder="Todos" />
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Vencimento De</Label>
              <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="De" />
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Vencimento Até</Label>
              <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="Até" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('Todos'); setFilterCliente(''); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>Limpar</Button>
            <div className="flex-1" />
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Título</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
              <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar primeiro título</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {[
                      { key: 'data_vencimento', label: 'Vencimento' },
                      { key: 'cliente', label: 'Cliente' },
                      { key: 'tipo_honorario', label: 'Tipo' },
                      { key: 'descricao', label: 'Descrição' },
                      { key: 'valor_original', label: 'Valor Original' },
                      { key: 'juros_multa', label: 'Juros/Multa' },
                      { key: 'total', label: 'Val. Total' },
                      { key: 'valor_recebido', label: 'Recebido' },
                      { key: 'saldo', label: 'Saldo' },
                      { key: 'status', label: 'Status' },
                      { key: 'dias', label: 'Atraso' },
                    ].map(col => (
                      <th key={col.key} className="text-left py-3 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground text-xs whitespace-nowrap" onClick={() => handleSort(col.key)}>
                        {col.label} {sortCol === col.key && (sortAsc ? '↑' : '↓')}
                      </th>
                    ))}
                    <th className="py-3 px-2 text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => {
                    const total = Number(c.valor_original) + Number(c.juros_multa || 0);
                    const saldo = total - Number(c.valor_recebido || 0);
                    return (
                      <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-2 px-2 whitespace-nowrap">{formatDate(c.data_vencimento)}</td>
                        <td className="py-2 px-2">{c.clientes?.nome || '—'}</td>
                        <td className="py-2 px-2 text-xs">{c.tipo_honorario || '—'}</td>
                        <td className="py-2 px-2 max-w-[180px] truncate">{c.descricao || '—'}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.valor_original))}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.juros_multa || 0))}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(total)}</td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-600">{formatCurrency(Number(c.valor_recebido || 0))}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(saldo)}</td>
                        <td className="py-2 px-2">
                          <Badge className={`text-[10px] ${statusBadge[c.status] || ''}`} variant="outline">{c.status}</Badge>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{diasAtraso(c)}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            {(c.status === 'Pendente' || c.status === 'Parcial' || c.status === 'Vencido') && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Baixar" onClick={() => openBaixar(c)}>
                                <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs">
              <div className="flex gap-4">
                <span className="text-yellow-700 font-semibold">Pendente: {formatCurrency(totalPendente)}</span>
                <span className="text-emerald-700 font-semibold">Recebido: {formatCurrency(totalRecebido)}</span>
                <span className="text-destructive font-semibold">Vencido: {formatCurrency(totalVencido)}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <span>{page + 1} / {totalPages || 1}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Título' : 'Novo Título a Receber'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Emissão</Label><DatePicker value={form.data_emissao} onChange={d => setForm({ ...form, data_emissao: d })} /></div>
              <div><Label className="text-xs">Data Vencimento *</Label><DatePicker value={form.data_vencimento} onChange={d => setForm({ ...form, data_vencimento: d })} /></div>
            </div>
            <div><Label className="text-xs">Competência</Label><DatePicker value={form.competencia} onChange={d => setForm({ ...form, competencia: d })} /></div>
            <div><Label className="text-xs">Cliente *</Label><SearchableCombobox options={clienteOptions} value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })} placeholder="Selecione cliente" /></div>
            <div><Label className="text-xs">Nº Processo</Label><Input value={form.num_processo} onChange={e => setForm({ ...form, num_processo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Área Jurídica</Label>
                <Select value={form.area_juridica} onValueChange={v => setForm({ ...form, area_juridica: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Tipo Honorário</Label>
                <Select value={form.tipo_honorario} onValueChange={v => setForm({ ...form, tipo_honorario: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPO_HONORARIO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Descrição *</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Valor Original *</Label><CurrencyInput value={form.valor_original} onChange={v => setForm({ ...form, valor_original: v })} required /></div>
              <div><Label className="text-xs">Juros/Multa</Label><CurrencyInput value={form.juros_multa} onChange={v => setForm({ ...form, juros_multa: v })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Forma Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{FORMAS_PAG.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Conta Bancária</Label>
                <Select value={form.conta_bancaria_id} onValueChange={v => setForm({ ...form, conta_bancaria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{contasBancarias.map(cb => <SelectItem key={cb.id} value={cb.id}>{cb.banco} - {cb.conta}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">NF/Recibo</Label><Input value={form.nf_recibo} onChange={e => setForm({ ...form, nf_recibo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Sócio Responsável</Label>
                <Select value={form.socio_id} onValueChange={v => setForm({ ...form, socio_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{socios.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Baixar Dialog */}
      <Dialog open={baixarOpen} onOpenChange={setBaixarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Baixar Título</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Saldo a Receber</Label><Input readOnly value={baixarConta ? formatCurrency(Number(baixarConta.valor_original) + Number(baixarConta.juros_multa || 0) - Number(baixarConta.valor_recebido || 0)) : ''} className="bg-muted" /></div>
            <div><Label className="text-xs">Valor Recebido</Label><CurrencyInput value={baixarValor} onChange={setBaixarValor} /></div>
            <div><Label className="text-xs">Data Recebimento</Label><DatePicker value={baixarData} onChange={setBaixarData} /></div>
            <div><Label className="text-xs">Forma Pagamento</Label>
              <Select value={baixarForma} onValueChange={setBaixarForma}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{FORMAS_PAG.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Conta Bancária</Label>
              <Select value={baixarContaBancaria} onValueChange={setBaixarContaBancaria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{contasBancarias.map(cb => <SelectItem key={cb.id} value={cb.id}>{cb.banco} - {cb.conta}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixarOpen(false)}>Cancelar</Button>
            <Button onClick={handleBaixar}>Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir título?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este título a receber?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
