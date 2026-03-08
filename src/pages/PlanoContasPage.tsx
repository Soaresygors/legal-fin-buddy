import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function PlanoContasPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('plano_contas')
        .select('*')
        .order('codigo');
      setContas(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = contas.filter(c =>
    search === '' ||
    c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    c.grupo?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by grupo
  const groups: Record<string, typeof contas> = {};
  filtered.forEach(c => {
    if (!groups[c.grupo]) groups[c.grupo] = [];
    groups[c.grupo].push(c);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Plano de Contas ({contas.length} contas)</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([grupo, items]) => (
                <div key={grupo}>
                  <h3 className="font-semibold text-sm mb-2 text-primary">{grupo}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground w-20">Código</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Descrição</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Subgrupo</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((c) => (
                          <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-2 px-2 font-mono text-xs">{c.codigo}</td>
                            <td className="py-2 px-2">{c.descricao}</td>
                            <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">{c.subgrupo || '-'}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant={c.tipo === 'R' ? 'default' : 'destructive'} className="text-xs">
                                {c.tipo === 'R' ? 'Rec' : 'Desp'}
                              </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
