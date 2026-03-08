import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, Users, Building2 } from 'lucide-react';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Escritório</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Razão Social:</strong> Percebon & Bosco Advogadas</p>
            <p><strong>Regime:</strong> Simples Nacional</p>
            <p><strong>Sócios:</strong> 3</p>
            <p><strong>Funcionários:</strong> 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Banco de Dados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Backend:</strong> Lovable Cloud (PostgreSQL)</p>
            <p><strong>Autenticação:</strong> Habilitada</p>
            <p><strong>RLS:</strong> Ativo em todas as tabelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Sócios</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Dra. Rebeca Percebon — 50% (Cível)</p>
            <p>Dra. Maria Bosco — 30% (Trabalhista)</p>
            <p>Dr. Alexandre — 20% (Empresarial)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Versão:</strong> 1.0.0</p>
            <p><strong>Formato de data:</strong> dd/MM/yyyy (pt-BR)</p>
            <p><strong>Moeda:</strong> BRL (R$)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
