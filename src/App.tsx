import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LancamentosPage from "./pages/LancamentosPage";
import ContasReceberPage from "./pages/ContasReceberPage";
import ContasPagarPage from "./pages/ContasPagarPage";
import FluxoCaixaPage from "./pages/FluxoCaixaPage";
import DREPage from "./pages/DREPage";
import IndicadoresPage from "./pages/IndicadoresPage";
import CadastrosPage from "./pages/CadastrosPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <YearProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/lancamentos" element={<LancamentosPage />} />
              <Route path="/contas-receber" element={<ContasReceberPage />} />
              <Route path="/contas-pagar" element={<ContasPagarPage />} />
              <Route path="/fluxo-caixa" element={<FluxoCaixaPage />} />
              <Route path="/dre" element={<DREPage />} />
              <Route path="/indicadores" element={<IndicadoresPage />} />
              <Route path="/cadastros" element={<Navigate to="/cadastros/clientes" replace />} />
              <Route path="/cadastros/clientes" element={<CadastrosPage />} />
              <Route path="/cadastros/plano-contas" element={<CadastrosPage />} />
              <Route path="/cadastros/centros-custo" element={<CadastrosPage />} />
              <Route path="/cadastros/socios" element={<CadastrosPage />} />
              <Route path="/cadastros/contas-bancarias" element={<CadastrosPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </YearProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
