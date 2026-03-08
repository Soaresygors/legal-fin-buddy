import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SearchableCombobox } from '@/components/SearchableCombobox';
import { CurrencyInput } from '@/components/CurrencyInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react';

const AREAS = ['Cível', 'Trabalhista', 'Tributário', 'Empresarial', 'Família e Sucessões', 'Criminal', 'Imobiliário', 'Consumidor', 'Previdenciário'];

const tabMap: Record<string, string> = {
  '/cadastros/socios': 'socios',
  '/cadastros/clientes': 'clientes',
  '/cadastros/contas-bancarias': 'contas-bancarias',
  '/cadastros/centros-custo': 'centros-custo',
  '/cadastros/plano-contas': 'plano-contas',
};

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">Nenhum {label} encontrado</p>
      <Button className="mt-4" onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> Criar primeiro</Button>
    </div>
  );
}

// ========== CLIENTES TAB ==========
function ClientesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { nome: '', cpf_cnpj: '', tipo_pf_pj: 'PJ', telefone: '', email: '', area_juridica: '', socio_id: '', status: 'Ativo', observacoes: '' };
  const [form, setForm] = useState({ ...emptyForm });

  async function fetchAll() {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      supabase.from('clientes').select('*, socios(nome)').order('nome'),
      supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    setItems(cRes.data || []);
    setSocios(sRes.data || []);
    setLoading(false);
  }
  useEffect(() => { fetchAll(); }, []);

  function formatCpfCnpj(val: string, tipo: string) {
    const digits = val.replace(/\D/g, '');
    if (tipo === 'PF') {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  }

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, '');
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
  }

  const filtered = items.filter(c => !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.cpf_cnpj?.includes(search));

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }
  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({ nome: c.nome || '', cpf_cnpj: c.cpf_cnpj || '', tipo_pf_pj: c.tipo_pf_pj || 'PJ', telefone: c.telefone || '', email: c.email || '', area_juridica: c.area_juridica || '', socio_id: c.socio_id || '', status: c.status || 'Ativo', observacoes: c.observacoes || '' });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.nome) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = { nome: form.nome, cpf_cnpj: form.cpf_cnpj || null, tipo_pf_pj: form.tipo_pf_pj, telefone: form.telefone || null, email: form.email || null, area_juridica: form.area_juridica || null, socio_id: form.socio_id || null, status: form.status, observacoes: form.observacoes || null };
    try {
      if (editingId) { const { error } = await supabase.from('clientes').update(payload).eq('id', editingId); if (error) throw error; toast.success('Cliente atualizado'); }
      else { const { error } = await supabase.from('clientes').insert(payload); if (error) throw error; toast.success('Cliente criado'); }
      setSheetOpen(false); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { const { error } = await supabase.from('clientes').delete().eq('id', deleteId); if (error) throw error; toast.success('Cliente excluído'); setDeleteId(null); fetchAll(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
      </div>

      {filtered.length === 0 ? <EmptyState label="cliente" onAdd={openNew} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              {['Nome', 'CPF/CNPJ', 'Tipo', 'Telefone', 'Email', 'Área', 'Sócio Resp.', 'Status', ''].map(h => <th key={h} className="text-left py-3 px-2 font-medium text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{c.nome}</td>
                  <td className="py-2 px-2 font-mono text-xs">{c.cpf_cnpj || '—'}</td>
                  <td className="py-2 px-2"><Badge variant="secondary" className="text-[10px]">{c.tipo_pf_pj}</Badge></td>
                  <td className="py-2 px-2 text-xs">{c.telefone || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.email || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.area_juridica || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.socios?.nome || '—'}</td>
                  <td className="py-2 px-2"><Badge variant={c.status === 'Ativo' ? 'default' : 'outline'} className="text-[10px]">{c.status}</Badge></td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label className="text-xs">Tipo</Label>
              <RadioGroup value={form.tipo_pf_pj} onValueChange={v => setForm({ ...form, tipo_pf_pj: v })} className="flex gap-4 mt-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="PF" id="pf" /><Label htmlFor="pf">Pessoa Física</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="PJ" id="pj" /><Label htmlFor="pj">Pessoa Jurídica</Label></div>
              </RadioGroup>
            </div>
            <div><Label className="text-xs">CPF/CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: formatCpfCnpj(e.target.value, form.tipo_pf_pj) })} placeholder={form.tipo_pf_pj === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} /></div>
            <div><Label className="text-xs">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label className="text-xs">Área Jurídica</Label>
              <Select value={form.area_juridica} onValueChange={v => setForm({ ...form, area_juridica: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Sócio Responsável</Label>
              <Select value={form.socio_id} onValueChange={v => setForm({ ...form, socio_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{socios.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
          </div>
          <SheetFooter><Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== PLANO DE CONTAS TAB ==========
function PlanoContasTab() {
  const [items, setItems] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyForm = { codigo: '', grupo: '', subgrupo: '', descricao: '', tipo: 'D', natureza: '', centro_custo_padrao: '', ativo: true };
  const [form, setForm] = useState({ ...emptyForm });

  async function fetchAll() {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from('plano_contas').select('*').order('codigo'),
      supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    setItems(pRes.data || []);
    setCentros(cRes.data || []);
    setLoading(false);
  }
  useEffect(() => { fetchAll(); }, []);

  const grupos = useMemo(() => [...new Set(items.map(i => i.grupo))].sort(), [items]);
  const filtered = items.filter(c => !search || c.codigo?.toLowerCase().includes(search.toLowerCase()) || c.descricao?.toLowerCase().includes(search.toLowerCase()) || c.grupo?.toLowerCase().includes(search.toLowerCase()));

  // Group by grupo
  const grouped: Record<string, any[]> = {};
  filtered.forEach(c => { if (!grouped[c.grupo]) grouped[c.grupo] = []; grouped[c.grupo].push(c); });

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }
  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({ codigo: c.codigo, grupo: c.grupo, subgrupo: c.subgrupo || '', descricao: c.descricao, tipo: c.tipo, natureza: c.natureza || '', centro_custo_padrao: c.centro_custo_padrao || '', ativo: c.ativo !== false });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.codigo || !form.descricao || !form.grupo) { toast.error('Preencha código, grupo e descrição'); return; }
    setSaving(true);
    const payload = { codigo: form.codigo, grupo: form.grupo, subgrupo: form.subgrupo || null, descricao: form.descricao, tipo: form.tipo, natureza: form.natureza || null, centro_custo_padrao: form.centro_custo_padrao || null, ativo: form.ativo };
    try {
      if (editingId) { const { error } = await supabase.from('plano_contas').update(payload).eq('id', editingId); if (error) throw error; toast.success('Conta atualizada'); }
      else { const { error } = await supabase.from('plano_contas').insert(payload); if (error) throw error; toast.success('Conta criada'); }
      setSheetOpen(false); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function tryDelete(id: string) {
    // Check for linked lancamentos
    const { count } = await supabase.from('lancamentos').select('id', { count: 'exact', head: true }).eq('conta_id', id);
    if (count && count > 0) {
      setDeleteErr(`Esta conta possui ${count} lançamento(s) vinculado(s) e não pode ser excluída.`);
      setDeleteId(id);
    } else {
      setDeleteErr('');
      setDeleteId(id);
    }
  }

  async function handleDelete() {
    if (!deleteId || deleteErr) { setDeleteId(null); return; }
    try { const { error } = await supabase.from('plano_contas').delete().eq('id', deleteId); if (error) throw error; toast.success('Conta excluída'); setDeleteId(null); fetchAll(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
      </div>

      {Object.keys(grouped).length === 0 ? <EmptyState label="conta" onAdd={openNew} /> : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([grupo, list]) => (
            <div key={grupo}>
              <h3 className="font-semibold text-sm mb-2 text-primary">{grupo}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    {['Código', 'Descrição', 'Subgrupo', 'Tipo', 'Natureza', 'CC Padrão', 'Ativo', ''].map(h => <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono text-xs">{c.codigo}</td>
                        <td className="py-2 px-2">{c.descricao}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{c.subgrupo || '—'}</td>
                        <td className="py-2 px-2"><Badge variant={c.tipo === 'R' ? 'default' : 'destructive'} className="text-[10px]">{c.tipo === 'R' ? 'Rec' : 'Desp'}</Badge></td>
                        <td className="py-2 px-2 text-xs">{c.natureza || '—'}</td>
                        <td className="py-2 px-2 text-xs">{c.centro_custo_padrao || '—'}</td>
                        <td className="py-2 px-2"><Badge variant={c.ativo ? 'default' : 'outline'} className="text-[10px]">{c.ativo ? 'Sim' : 'Não'}</Badge></td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => tryDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Conta' : 'Nova Conta'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-xs">Código *</Label><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></div>
            <div><Label className="text-xs">Grupo *</Label>
              <Select value={form.grupo} onValueChange={v => setForm({ ...form, grupo: v })}><SelectTrigger><SelectValue placeholder="Selecione grupo" /></SelectTrigger><SelectContent>{grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Subgrupo</Label><Input value={form.subgrupo} onChange={e => setForm({ ...form, subgrupo: e.target.value })} /></div>
            <div><Label className="text-xs">Descrição *</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label className="text-xs">Tipo</Label>
              <RadioGroup value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })} className="flex gap-4 mt-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="R" id="tipo-r" /><Label htmlFor="tipo-r">Receita</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="D" id="tipo-d" /><Label htmlFor="tipo-d">Despesa</Label></div>
              </RadioGroup>
            </div>
            <div><Label className="text-xs">Natureza</Label>
              <Select value={form.natureza} onValueChange={v => setForm({ ...form, natureza: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{['Operacional', 'Financeira', 'Tributária', 'Não Operacional'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">CC Padrão</Label>
              <Select value={form.centro_custo_padrao} onValueChange={v => setForm({ ...form, centro_custo_padrao: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} /><Label className="text-xs">Ativo</Label></div>
          </div>
          <SheetFooter><Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteErr(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{deleteErr ? 'Não é possível excluir' : 'Excluir conta?'}</AlertDialogTitle><AlertDialogDescription>{deleteErr || 'Esta ação não pode ser desfeita.'}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!deleteErr && <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== CENTROS DE CUSTO TAB ==========
function CentrosCustoTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { codigo: '', nome: '', descricao: '', responsavel: '', ativo: true };
  const [form, setForm] = useState({ ...emptyForm });

  async function fetchAll() { setLoading(true); const { data } = await supabase.from('centros_custo').select('*').order('codigo'); setItems(data || []); setLoading(false); }
  useEffect(() => { fetchAll(); }, []);

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }
  function openEdit(c: any) { setEditingId(c.id); setForm({ codigo: c.codigo || '', nome: c.nome, descricao: c.descricao || '', responsavel: c.responsavel || '', ativo: c.ativo !== false }); setSheetOpen(true); }

  async function handleSave() {
    if (!form.nome) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = { codigo: form.codigo || null, nome: form.nome, descricao: form.descricao || null, responsavel: form.responsavel || null, ativo: form.ativo };
    try {
      if (editingId) { const { error } = await supabase.from('centros_custo').update(payload).eq('id', editingId); if (error) throw error; toast.success('Centro atualizado'); }
      else { const { error } = await supabase.from('centros_custo').insert(payload); if (error) throw error; toast.success('Centro criado'); }
      setSheetOpen(false); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { const { error } = await supabase.from('centros_custo').delete().eq('id', deleteId); if (error) throw error; toast.success('Centro excluído'); setDeleteId(null); fetchAll(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex justify-end mb-4"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Centro</Button></div>
      {items.length === 0 ? <EmptyState label="centro de custo" onAdd={openNew} /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            {['Código', 'Nome', 'Descrição', 'Responsável', 'Ativo', ''].map(h => <th key={h} className="text-left py-3 px-2 font-medium text-muted-foreground text-xs">{h}</th>)}
          </tr></thead>
          <tbody>{items.map(c => (
            <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
              <td className="py-2 px-2 font-mono text-xs">{c.codigo || '—'}</td>
              <td className="py-2 px-2 font-medium">{c.nome}</td>
              <td className="py-2 px-2 text-xs text-muted-foreground">{c.descricao || '—'}</td>
              <td className="py-2 px-2 text-xs">{c.responsavel || '—'}</td>
              <td className="py-2 px-2"><Badge variant={c.ativo ? 'default' : 'outline'} className="text-[10px]">{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
              <td className="py-2 px-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Centro' : 'Novo Centro de Custo'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-xs">Código</Label><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></div>
            <div><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} /><Label className="text-xs">Ativo</Label></div>
          </div>
          <SheetFooter><Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir centro?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== SÓCIOS TAB ==========
function SociosTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { nome: '', oab: '', participacao: null as number | null, area_principal: '', ativo: true };
  const [form, setForm] = useState({ ...emptyForm });

  async function fetchAll() { setLoading(true); const { data } = await supabase.from('socios').select('*').order('nome'); setItems(data || []); setLoading(false); }
  useEffect(() => { fetchAll(); }, []);

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }
  function openEdit(c: any) { setEditingId(c.id); setForm({ nome: c.nome, oab: c.oab || '', participacao: Number(c.participacao) || null, area_principal: c.area_principal || '', ativo: c.ativo !== false }); setSheetOpen(true); }

  async function handleSave() {
    if (!form.nome) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = { nome: form.nome, oab: form.oab || null, participacao: form.participacao, area_principal: form.area_principal || null, ativo: form.ativo };
    try {
      if (editingId) { const { error } = await supabase.from('socios').update(payload).eq('id', editingId); if (error) throw error; toast.success('Sócio atualizado'); }
      else { const { error } = await supabase.from('socios').insert(payload); if (error) throw error; toast.success('Sócio criado'); }
      setSheetOpen(false); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { const { error } = await supabase.from('socios').delete().eq('id', deleteId); if (error) throw error; toast.success('Sócio excluído'); setDeleteId(null); fetchAll(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex justify-end mb-4"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Sócio</Button></div>
      {items.length === 0 ? <EmptyState label="sócio" onAdd={openNew} /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            {['Nome', 'OAB', 'Participação %', 'Área Principal', 'Ativo', ''].map(h => <th key={h} className="text-left py-3 px-2 font-medium text-muted-foreground text-xs">{h}</th>)}
          </tr></thead>
          <tbody>{items.map(c => (
            <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
              <td className="py-2 px-2 font-medium">{c.nome}</td>
              <td className="py-2 px-2 text-xs">{c.oab || '—'}</td>
              <td className="py-2 px-2 text-xs">{c.participacao != null ? `${c.participacao}%` : '—'}</td>
              <td className="py-2 px-2 text-xs">{c.area_principal || '—'}</td>
              <td className="py-2 px-2"><Badge variant={c.ativo ? 'default' : 'outline'} className="text-[10px]">{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
              <td className="py-2 px-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Sócio' : 'Novo Sócio'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label className="text-xs">OAB</Label><Input value={form.oab} onChange={e => setForm({ ...form, oab: e.target.value })} /></div>
            <div><Label className="text-xs">Participação %</Label><Input type="number" value={form.participacao ?? ''} onChange={e => setForm({ ...form, participacao: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label className="text-xs">Área Principal</Label>
              <Select value={form.area_principal} onValueChange={v => setForm({ ...form, area_principal: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} /><Label className="text-xs">Ativo</Label></div>
          </div>
          <SheetFooter><Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir sócio?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== CONTAS BANCÁRIAS TAB ==========
function ContasBancariasTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { banco: '', agencia: '', conta: '', tipo: 'Conta Corrente', saldo_inicial: null as number | null, ativa: true };
  const [form, setForm] = useState({ ...emptyForm });

  async function fetchAll() { setLoading(true); const { data } = await supabase.from('contas_bancarias').select('*').order('banco'); setItems(data || []); setLoading(false); }
  useEffect(() => { fetchAll(); }, []);

  function openNew() { setEditingId(null); setForm({ ...emptyForm }); setSheetOpen(true); }
  function openEdit(c: any) { setEditingId(c.id); setForm({ banco: c.banco, agencia: c.agencia || '', conta: c.conta || '', tipo: c.tipo || 'Conta Corrente', saldo_inicial: Number(c.saldo_inicial) || null, ativa: c.ativa !== false }); setSheetOpen(true); }

  async function handleSave() {
    if (!form.banco) { toast.error('Banco é obrigatório'); return; }
    setSaving(true);
    const payload = { banco: form.banco, agencia: form.agencia || null, conta: form.conta || null, tipo: form.tipo, saldo_inicial: form.saldo_inicial || 0, ativa: form.ativa };
    try {
      if (editingId) { const { error } = await supabase.from('contas_bancarias').update(payload).eq('id', editingId); if (error) throw error; toast.success('Conta atualizada'); }
      else { const { error } = await supabase.from('contas_bancarias').insert(payload); if (error) throw error; toast.success('Conta criada'); }
      setSheetOpen(false); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { const { error } = await supabase.from('contas_bancarias').delete().eq('id', deleteId); if (error) throw error; toast.success('Conta excluída'); setDeleteId(null); fetchAll(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex justify-end mb-4"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button></div>
      {items.length === 0 ? <EmptyState label="conta bancária" onAdd={openNew} /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            {['Banco', 'Agência', 'Conta', 'Tipo', 'Saldo Inicial', 'Ativa', ''].map(h => <th key={h} className="text-left py-3 px-2 font-medium text-muted-foreground text-xs">{h}</th>)}
          </tr></thead>
          <tbody>{items.map(c => (
            <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
              <td className="py-2 px-2 font-medium">{c.banco}</td>
              <td className="py-2 px-2 text-xs">{c.agencia || '—'}</td>
              <td className="py-2 px-2 text-xs font-mono">{c.conta || '—'}</td>
              <td className="py-2 px-2 text-xs">{c.tipo || '—'}</td>
              <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(c.saldo_inicial || 0))}</td>
              <td className="py-2 px-2"><Badge variant={c.ativa ? 'default' : 'outline'} className="text-[10px]">{c.ativa ? 'Sim' : 'Não'}</Badge></td>
              <td className="py-2 px-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader><SheetTitle>{editingId ? 'Editar Conta' : 'Nova Conta Bancária'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-xs">Banco *</Label><Input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Agência</Label><Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} /></div>
              <div><Label className="text-xs">Conta</Label><Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Conta Corrente', 'Poupança', 'Caixa Físico'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Saldo Inicial</Label><CurrencyInput value={form.saldo_inicial} onChange={v => setForm({ ...form, saldo_inicial: v })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativa} onCheckedChange={v => setForm({ ...form, ativa: v })} /><Label className="text-xs">Ativa</Label></div>
          </div>
          <SheetFooter><Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta bancária?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== MAIN PAGE ==========
export default function CadastrosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = tabMap[location.pathname] || 'socios';

  function handleTabChange(tab: string) {
    const path = Object.entries(tabMap).find(([_, v]) => v === tab)?.[0] || '/cadastros/socios';
    navigate(path);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardContent className="p-4">
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
              <TabsTrigger value="socios">Sócios</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="contas-bancarias">Contas Bancárias</TabsTrigger>
              <TabsTrigger value="centros-custo">Centros de Custo</TabsTrigger>
              <TabsTrigger value="plano-contas">Plano de Contas</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="socios"><SociosTab /></TabsContent>
              <TabsContent value="clientes"><ClientesTab /></TabsContent>
              <TabsContent value="contas-bancarias"><ContasBancariasTab /></TabsContent>
              <TabsContent value="centros-custo"><CentrosCustoTab /></TabsContent>
              <TabsContent value="plano-contas"><PlanoContasTab /></TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
