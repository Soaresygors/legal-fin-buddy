import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LancamentosPage from "./pages/LancamentosPage";
import ContasReceberPage from "./pages/ContasReceberPage";
import ContasPagarPage from "./pages/ContasPagarPage";
import FluxoCaixaPage from "./pages/FluxoCaixaPage";
import DREPage from "./pages/DREPage";
import IndicadoresPage from "./pages/IndicadoresPage";
import ClientesPage from "./pages/ClientesPage";
import PlanoContasPage from "./pages/PlanoContasPage";
import CentrosCustoPage from "./pages/CentrosCustoPage";
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
              <Route path="/cadastros/clientes" element={<ClientesPage />} />
              <Route path="/cadastros/plano-contas" element={<PlanoContasPage />} />
              <Route path="/cadastros/centros-custo" element={<CentrosCustoPage />} />
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
