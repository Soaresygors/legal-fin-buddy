import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useYear } from '@/contexts/YearContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function LancamentosPage() {
  const { selectedYear } = useYear();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('lancamentos')
        .select('*, plano_contas(codigo, descricao), clientes(nome), socios(nome), centros_custo(nome)')
        .gte('competencia', `${selectedYear}-01-01`)
        .lte('competencia', `${selectedYear}-12-31`)
        .order('data_lancamento', { ascending: false });
      setLancamentos(data || []);
      setLoading(false);
    }
    load();
  }, [selectedYear]);

  const filtered = lancamentos.filter((l) => {
    const matchSearch = search === '' || 
      l.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      l.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.plano_contas?.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'all' || l.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Lançamentos {selectedYear}</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="R">Receitas</SelectItem>
                  <SelectItem value="D">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Conta</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Cliente</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2">{formatDate(l.data_lancamento)}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant={l.tipo === 'R' ? 'default' : 'destructive'} className="text-xs">
                          {l.tipo === 'R' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-xs">
                        <span className="font-mono text-muted-foreground">{l.plano_contas?.codigo}</span>{' '}
                        {l.plano_contas?.descricao}
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell max-w-[200px] truncate">{l.descricao}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell">{l.clientes?.nome || '-'}</td>
                      <td className={`py-2.5 px-2 text-right font-medium ${l.tipo === 'R' ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(l.valor_realizado)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={l.status === 'Pago' ? 'secondary' : 'outline'} className="text-xs">
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
