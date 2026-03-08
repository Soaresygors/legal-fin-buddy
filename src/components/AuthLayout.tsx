import { useState, useEffect, useRef } from 'react';
import { Scale, FileText, Users, Landmark } from 'lucide-react';

function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1F3864] to-[#2E75B6] relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="relative z-10 text-center">
          <h1 className="text-8xl font-bold text-white tracking-tight">P&B</h1>
          <p className="mt-4 text-xl text-white/90 font-medium">Percebon & Bosco Advogados</p>
          <p className="mt-1 text-sm text-white/60">Sistema de Controle Financeiro</p>

          {/* Animated stats */}
          <div className="mt-12 flex gap-8 justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mx-auto mb-2">
                <FileText className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter end={2542} />
              </p>
              <p className="text-xs text-white/60 mt-1">Lançamentos</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mx-auto mb-2">
                <Users className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter end={258} />
              </p>
              <p className="text-xs text-white/60 mt-1">Clientes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mx-auto mb-2">
                <Landmark className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter end={36} />
              </p>
              <p className="text-xs text-white/60 mt-1">Contas</p>
            </div>
          </div>
        </div>
        <Scale className="absolute bottom-8 right-8 h-64 w-64 text-white/[0.06]" strokeWidth={0.8} />
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Scale className="h-6 w-6 text-[#1F3864]" />
          <span className="text-xl font-bold text-foreground">P&B Advogados</span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          &copy; 2026 Percebon &amp; Bosco Advogados
        </p>
      </div>
    </div>
  );
}
