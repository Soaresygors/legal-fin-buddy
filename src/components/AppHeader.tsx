import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

const breadcrumbMap: Record<string, string[]> = {
  '/': ['Dashboard'],
  '/lancamentos': ['Lançamentos'],
  '/contas-receber': ['Contas a Receber'],
  '/contas-pagar': ['Contas a Pagar'],
  '/importacao': ['Importação'],
  '/dre': ['DRE'],
  '/cadastros/socios': ['Cadastros', 'Sócios'],
  '/cadastros/clientes': ['Cadastros', 'Clientes'],
  '/cadastros/contas-bancarias': ['Cadastros', 'Contas Bancárias'],
  '/cadastros/centros-custo': ['Cadastros', 'Centros de Custo'],
  '/cadastros/plano-contas': ['Cadastros', 'Plano de Contas'],
};

interface AppHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function AppHeader({ title, onMenuClick }: AppHeaderProps) {
  const { selectedYear, setSelectedYear } = useYear();
  const location = useLocation();
  const [notificationCount] = useState(3);

  const crumbs = breadcrumbMap[location.pathname] || [title];

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <span className={i === crumbs.length - 1 ? 'font-semibold text-[#1F3864]' : 'text-muted-foreground'}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
