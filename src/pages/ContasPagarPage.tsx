import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCombobox } from '@/components/SearchableCombobox';
import { CurrencyInput } from '@/components/CurrencyInput';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUpFromLine, CalendarIcon, FileText } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['Pendente', 'Pago', 'Parcial', 'Vencido', 'Cancelado'];
const FORMAS_PAG = ['PIX', 'Transferência', 'Boleto', 'Cartão Crédito', 'Cartão Débito', 'Cheque', 'Dinheiro', 'DAS', 'Débito Automático', 'Outros'];
const PAGE_SIZE = 25;

const statusBadge: Record<string, string> = {
  Pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Pago: 'bg-green-100 text-green-700 border-green-200',
  Vencido: 'bg-red-100 text-red-700 border-red-200',
  Parcial: 'bg-orange-100 text-orange-700 border-orange-200',
  Cancelado: 'bg-muted text-muted-foreground',
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
  fornecedor: '',
  conta_id: '',
  centro_custo_id: '',
  descricao: '',
  valor_original: null as number | null,
  desconto: 0 as number | null,
  juros_multa: 0 as number | null,
  forma_pagamento: '',
  conta_bancaria_id: '',
  num_documento: '',
  status: 'Pendente',
  recorrente: false,
};

export default function ContasPagarPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planoContas, setPlanoContas] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('data_vencimento');
  const [sortAsc, setSortAsc] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [baixarOpen, setBaixarOpen] = useState(false);
  const [baixarConta, setBaixarConta] = useState<any>(null);
  const [baixarValor, setBaixarValor] = useState<number | null>(null);
  const [baixarData, setBaixarData] = useState<Date | undefined>(new Date());
  const [baixarForma, setBaixarForma] = useState('');
  const [baixarContaBancaria, setBaixarContaBancaria] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    const [cpRes, pcRes, ccRes, cbRes] = await Promise.all([
      supabase.from('contas_pagar').select('*, plano_contas:conta_id(codigo, descricao), centros_custo:centro_custo_id(nome)').order('data_vencimento', { ascending: false }),
      supabase.from('plano_contas').select('id, codigo, descricao').eq('tipo', 'D').eq('ativo', true).order('codigo'),
      supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('contas_bancarias').select('id, banco, conta').eq('ativa', true),
    ]);
    setContas(cpRes.data || []);
    setPlanoContas(pcRes.data || []);
    setCentros(ccRes.data || []);
    setContasBancarias(cbRes.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const contaOptions = useMemo(() => planoContas.map(c => ({ value: c.id, label: `${c.codigo} - ${c.descricao}` })), [planoContas]);

  const filtered = useMemo(() => {
    let list = [...contas];
    if (filterStatus !== 'Todos') list = list.filter(c => c.status === filterStatus);
    if (filterDateFrom) list = list.filter(c => c.data_vencimento >= format(filterDateFrom, 'yyyy-MM-dd'));
    if (filterDateTo) list = list.filter(c => c.data_vencimento <= format(filterDateTo, 'yyyy-MM-dd'));
    list.sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [contas, filterStatus, filterDateFrom, filterDateTo, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalPendente = filtered.filter(c => ['Pendente', 'Parcial'].includes(c.status)).reduce((s, c) => s + Number(c.valor_original) - Number(c.desconto || 0) + Number(c.juros_multa || 0) - Number(c.valor_pago || 0), 0);
  const totalPago = filtered.filter(c => c.status === 'Pago').reduce((s, c) => s + Number(c.valor_pago || 0), 0);
  const totalVencido = filtered.filter(c => c.status === 'Vencido').reduce((s, c) => s + Number(c.valor_original) - Number(c.desconto || 0) + Number(c.juros_multa || 0) - Number(c.valor_pago || 0), 0);

  function handleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }

  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({
      data_emissao: c.data_emissao ? parseISO(c.data_emissao) : undefined,
      data_vencimento: c.data_vencimento ? parseISO(c.data_vencimento) : undefined,
      competencia: c.competencia ? parseISO(c.competencia) : undefined,
      fornecedor: c.fornecedor || '',
      conta_id: c.conta_id || '',
      centro_custo_id: c.centro_custo_id || '',
      descricao: c.descricao || '',
      valor_original: Number(c.valor_original) || null,
      desconto: Number(c.desconto) || 0,
      juros_multa: Number(c.juros_multa) || 0,
      forma_pagamento: c.forma_pagamento || '',
      conta_bancaria_id: c.conta_bancaria_id || '',
      num_documento: c.num_documento || '',
      status: c.status || 'Pendente',
      recorrente: c.recorrente || false,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.data_vencimento || !form.fornecedor || !form.valor_original) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setSaving(true);
    const payload: any = {
      data_emissao: form.data_emissao ? format(form.data_emissao, 'yyyy-MM-dd') : null,
      data_vencimento: format(form.data_vencimento, 'yyyy-MM-dd'),
      competencia: form.competencia ? format(form.competencia, 'yyyy-MM-dd') : null,
      fornecedor: form.fornecedor,
      conta_id: form.conta_id || null,
      centro_custo_id: form.centro_custo_id || null,
      descricao: form.descricao || null,
      valor_original: form.valor_original,
      desconto: form.desconto || 0,
      juros_multa: form.juros_multa || 0,
      forma_pagamento: form.forma_pagamento || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      num_documento: form.num_documento || null,
      status: form.status,
      recorrente: form.recorrente,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('contas_pagar').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Conta atualizada');
      } else {
        const { error } = await supabase.from('contas_pagar').insert(payload);
        if (error) throw error;
        toast.success('Conta criada');
      }
      setSheetOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('contas_pagar').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Conta excluída');
      setDeleteId(null);
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Erro ao excluir'); }
  }

  function openBaixar(c: any) {
    const saldo = Number(c.valor_original) - Number(c.desconto || 0) + Number(c.juros_multa || 0) - Number(c.valor_pago || 0);
    setBaixarConta(c);
    setBaixarValor(saldo);
    setBaixarData(new Date());
    setBaixarForma('');
    setBaixarContaBancaria('');
    setBaixarOpen(true);
  }

  async function handleBaixar() {
    if (!baixarConta || !baixarValor) return;
    const novoPago = Number(baixarConta.valor_pago || 0) + baixarValor;
    const total = Number(baixarConta.valor_original) - Number(baixarConta.desconto || 0) + Number(baixarConta.juros_multa || 0);
    const novoStatus = novoPago >= total ? 'Pago' : 'Parcial';
    try {
      const { error } = await supabase.from('contas_pagar').update({
        valor_pago: novoPago,
        data_pagamento: baixarData ? format(baixarData, 'yyyy-MM-dd') : null,
        forma_pagamento: baixarForma || null,
        conta_bancaria_id: baixarContaBancaria || null,
        status: novoStatus,
      }).eq('id', baixarConta.id);
      if (error) throw error;
      toast.success(`Baixa realizada — ${novoStatus}`);
      setBaixarOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Erro na baixa'); }
  }

  if (loading) {
    return <div className="space-y-4 animate-fade-in"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40"><Label className="text-xs mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-40"><Label className="text-xs mb-1 block">Vencimento De</Label><DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="De" /></div>
            <div className="w-40"><Label className="text-xs mb-1 block">Vencimento Até</Label><DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="Até" /></div>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('Todos'); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>Limpar</Button>
            <div className="flex-1" />
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
              <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar primeiro</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['data_vencimento', 'fornecedor', 'conta', 'descricao', 'valor_original', 'desconto', 'juros_multa', 'total', 'valor_pago', 'saldo', 'status', 'recorrente'].map(col => (
                      <th key={col} className="text-left py-3 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground text-xs whitespace-nowrap" onClick={() => handleSort(col)}>
                        {{ data_vencimento: 'Vencimento', fornecedor: 'Fornecedor', conta: 'Conta', descricao: 'Descrição', valor_original: 'Val. Original', desconto: 'Desconto', juros_multa: 'Juros/Multa', total: 'Val. Total', valor_pago: 'Pago', saldo: 'Saldo', status: 'Status', recorrente: 'Recorr.' }[col]}
                        {sortCol === col && (sortAsc ? ' ↑' : ' ↓')}
                      </th>
                    ))}
                    <th className="py-3 px-2 text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => {
                    const total = Number(c.valor_original) - Number(c.desconto || 0) + Number(c.juros_multa || 0);
                    const saldo = total - Number(c.valor_pago || 0);
                    return (
                      <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-2 px-2 whitespace-nowrap">{formatDate(c.data_vencimento)}</td>
                        <td className="py-2 px-2">{c.fornecedor || '—'}</td>
                        <td className="py-2 px-2 text-xs"><span className="font-mono text-muted-foreground">{c.plano_contas?.codigo}</span> {c.plano_contas?.descricao?.slice(0, 25)}</td>
                        <td className="py-2 px-2 max-w-[150px] truncate">{c.descricao || '—'}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.valor_original))}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.desconto || 0))}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.juros_multa || 0))}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(total)}</td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-600">{formatCurrency(Number(c.valor_pago || 0))}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(saldo)}</td>
                        <td className="py-2 px-2"><Badge className={`text-[10px] ${statusBadge[c.status] || ''}`} variant="outline">{c.status}</Badge></td>
                        <td className="py-2 px-2"><Badge variant={c.recorrente ? 'default' : 'outline'} className="text-[10px]">{c.recorrente ? 'Sim' : 'Não'}</Badge></td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            {['Pendente', 'Parcial', 'Vencido'].includes(c.status) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Baixar" onClick={() => openBaixar(c)}>
                                <ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-600" />
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

          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs">
              <div className="flex gap-4">
                <span className="text-yellow-700 font-semibold">Pendente: {formatCurrency(totalPendente)}</span>
                <span className="text-emerald-700 font-semibold">Pago: {formatCurrency(totalPago)}</span>
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
          <SheetHeader><SheetTitle>{editingId ? 'Editar Conta' : 'Nova Conta a Pagar'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Emissão</Label><DatePicker value={form.data_emissao} onChange={d => setForm({ ...form, data_emissao: d })} /></div>
              <div><Label className="text-xs">Data Vencimento *</Label><DatePicker value={form.data_vencimento} onChange={d => setForm({ ...form, data_vencimento: d })} /></div>
            </div>
            <div><Label className="text-xs">Competência</Label><DatePicker value={form.competencia} onChange={d => setForm({ ...form, competencia: d })} /></div>
            <div><Label className="text-xs">Fornecedor/Beneficiário *</Label><Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} required /></div>
            <div><Label className="text-xs">Conta do Plano</Label><SearchableCombobox options={contaOptions} value={form.conta_id} onValueChange={v => setForm({ ...form, conta_id: v })} placeholder="Selecione conta" /></div>
            <div><Label className="text-xs">Centro de Custo</Label>
              <Select value={form.centro_custo_id} onValueChange={v => setForm({ ...form, centro_custo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Valor Original *</Label><CurrencyInput value={form.valor_original} onChange={v => setForm({ ...form, valor_original: v })} required /></div>
              <div><Label className="text-xs">Desconto</Label><CurrencyInput value={form.desconto} onChange={v => setForm({ ...form, desconto: v })} /></div>
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
            <div><Label className="text-xs">Nº Documento/NF</Label><Input value={form.num_documento} onChange={e => setForm({ ...form, num_documento: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.recorrente} onCheckedChange={v => setForm({ ...form, recorrente: v })} />
                <Label className="text-xs">Recorrente</Label>
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
          <DialogHeader><DialogTitle>Baixar Conta a Pagar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Saldo a Pagar</Label><Input readOnly value={baixarConta ? formatCurrency(Number(baixarConta.valor_original) - Number(baixarConta.desconto || 0) + Number(baixarConta.juros_multa || 0) - Number(baixarConta.valor_pago || 0)) : ''} className="bg-muted" /></div>
            <div><Label className="text-xs">Valor Pago</Label><CurrencyInput value={baixarValor} onChange={setBaixarValor} /></div>
            <div><Label className="text-xs">Data Pagamento</Label><DatePicker value={baixarData} onChange={setBaixarData} /></div>
            <div><Label className="text-xs">Forma Pagamento</Label>
              <Select value={baixarForma} onValueChange={setBaixarForma}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{FORMAS_PAG.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Conta Bancária</Label>
              <Select value={baixarContaBancaria} onValueChange={setBaixarContaBancaria}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{contasBancarias.map(cb => <SelectItem key={cb.id} value={cb.id}>{cb.banco} - {cb.conta}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixarOpen(false)}>Cancelar</Button>
            <Button onClick={handleBaixar}>Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta conta a pagar?</AlertDialogDescription>
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
