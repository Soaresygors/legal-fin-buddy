import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ArrowDownCircle, ArrowUpCircle,
  TrendingUp, BarChart3, PieChart, Users, Settings,
  ChevronDown, Scale, Menu, X, FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Lançamentos', icon: FileText, path: '/lancamentos' },
  { label: 'Contas a Receber', icon: ArrowDownCircle, path: '/contas-receber' },
  { label: 'Contas a Pagar', icon: ArrowUpCircle, path: '/contas-pagar' },
  { label: 'Fluxo de Caixa', icon: TrendingUp, path: '/fluxo-caixa' },
  { label: 'DRE', icon: BarChart3, path: '/dre' },
  { label: 'Indicadores', icon: PieChart, path: '/indicadores' },
];

const cadastroNav = [
  { label: 'Clientes', path: '/cadastros/clientes' },
  { label: 'Plano de Contas', path: '/cadastros/plano-contas' },
  { label: 'Centros de Custo', path: '/cadastros/centros-custo' },
  { label: 'Sócios', path: '/cadastros/socios' },
  { label: 'Contas Bancárias', path: '/cadastros/contas-bancarias' },
];

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const [cadastroOpen, setCadastroOpen] = useState(
    location.pathname.startsWith('/cadastros')
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-60 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          "bg-sidebar text-sidebar-foreground",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Scale className="h-6 w-6 text-sidebar-active" />
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              P&B Advogadas
            </span>
          </Link>
          <button onClick={onToggle} className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3">
          {mainNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && onToggle()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                isActive(item.path)
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Cadastros dropdown */}
          <button
            onClick={() => setCadastroOpen(!cadastroOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 w-full",
              location.pathname.startsWith('/cadastros')
                ? "bg-sidebar-active text-sidebar-foreground"
                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            )}
          >
            <Users className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1 text-left">Cadastros</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", cadastroOpen && "rotate-180")} />
          </button>

          {cadastroOpen && (
            <div className="ml-4 pl-4 border-l border-sidebar-border">
              {cadastroNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                    isActive(item.path)
                      ? "text-sidebar-foreground font-medium"
                      : "text-sidebar-muted hover:text-sidebar-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            to="/admin/planilhas"
            onClick={() => window.innerWidth < 1024 && onToggle()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
              isActive('/admin/planilhas')
                ? "bg-sidebar-active text-sidebar-foreground"
                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            )}
          >
            <FileSpreadsheet className="h-4.5 w-4.5 shrink-0" />
            Planilhas Modelo
          </Link>

          <Link
            to="/admin/importacao"
            onClick={() => window.innerWidth < 1024 && onToggle()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
              isActive('/admin/importacao')
                ? "bg-sidebar-active text-sidebar-foreground"
                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            )}
          >
            <Upload className="h-4.5 w-4.5 shrink-0" />
            Importar CSV
          </Link>

          <Link
            to="/configuracoes"
            onClick={() => window.innerWidth < 1024 && onToggle()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
              isActive('/configuracoes')
                ? "bg-sidebar-active text-sidebar-foreground"
                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            )}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            Configurações
          </Link>
        </nav>
      </aside>
    </>
  );
}
