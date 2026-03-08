import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatCompetencia(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function getMonthName(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month] || '';
}
