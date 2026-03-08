import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, TrendingUp, TrendingDown,
  Upload, BarChart2, Settings,
  ChevronDown, Scale, X, LogOut, FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const mainNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Lançamentos', icon: FileText, path: '/lancamentos' },
  { label: 'Contas a Receber', icon: TrendingUp, path: '/contas-receber' },
  { label: 'Contas a Pagar', icon: TrendingDown, path: '/contas-pagar' },
  { label: 'Importação', icon: Upload, path: '/importacao' },
  { label: 'Planilhas Modelo', icon: FileSpreadsheet, path: '/planilhas-modelo' },
  { label: 'DRE', icon: BarChart2, path: '/dre' },
];

const cadastroNav = [
  { label: 'Sócios', path: '/cadastros/socios' },
  { label: 'Clientes', path: '/cadastros/clientes' },
  { label: 'Contas Bancárias', path: '/cadastros/contas-bancarias' },
  { label: 'Centros de Custo', path: '/cadastros/centros-custo' },
  { label: 'Plano de Contas', path: '/cadastros/plano-contas' },
];

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [cadastroOpen, setCadastroOpen] = useState(
    location.pathname.startsWith('/cadastros')
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const initials = profile?.nome
    ? profile.nome.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[260px] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          "bg-[#1F3864] text-white",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Scale className="h-6 w-6 text-[#D6E4F0]" />
            <span className="text-lg font-bold tracking-tight text-white">
              P&B Finanças
            </span>
          </Link>
          <button onClick={onToggle} className="lg:hidden text-white/50 hover:text-white">
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
                  ? "bg-[#2E75B6] text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Cadastros dropdown */}
          <button
            onClick={() => setCadastroOpen(!cadastroOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 w-full",
              location.pathname.startsWith('/cadastros')
                ? "bg-[#2E75B6] text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 text-left">Cadastros</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", cadastroOpen && "rotate-180")} />
          </button>

          {cadastroOpen && (
            <div className="ml-4 pl-4 border-l border-white/10">
              {cadastroNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                    isActive(item.path)
                      ? "text-white font-medium"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.nome || 'Usuário'}</p>
              <p className="text-xs text-white/50 truncate">{profile?.email || ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-white/40 hover:text-white transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
