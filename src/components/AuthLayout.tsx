import { Scale } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-blue-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="relative z-10 text-center">
          <h1 className="text-7xl font-bold text-white tracking-tight">P&B</h1>
          <p className="mt-4 text-lg text-slate-300">Percebon &amp; Bosco Advogadas</p>
          <p className="mt-1 text-sm text-slate-400">Sistema de Controle Financeiro</p>
        </div>
        <Scale className="absolute bottom-8 right-8 h-64 w-64 text-white/[0.06]" strokeWidth={0.8} />
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">P&B Advogadas</span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          © 2026 Percebon &amp; Bosco Advogadas — NoPonto Tech
        </p>
      </div>
    </div>
  );
}
