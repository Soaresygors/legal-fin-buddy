import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/lancamentos': 'Lançamentos',
  '/contas-receber': 'Contas a Receber',
  '/contas-pagar': 'Contas a Pagar',
  '/importacao': 'Importação',
  '/dre': 'DRE - Demonstrativo de Resultados',
  '/cadastros/socios': 'Cadastros',
  '/cadastros/clientes': 'Cadastros',
  '/cadastros/plano-contas': 'Cadastros',
  '/cadastros/centros-custo': 'Cadastros',
  '/cadastros/contas-bancarias': 'Cadastros',
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'P&B Finanças';

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC]">
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-h-screen">
        <AppHeader title={title} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
