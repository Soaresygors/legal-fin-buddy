-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- centros_custo
DROP POLICY IF EXISTS "Allow all access to centros_custo" ON public.centros_custo;
CREATE POLICY "Allow all access to centros_custo" ON public.centros_custo FOR ALL USING (true) WITH CHECK (true);

-- clientes
DROP POLICY IF EXISTS "Allow all access to clientes" ON public.clientes;
CREATE POLICY "Allow all access to clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

-- contas_bancarias
DROP POLICY IF EXISTS "Allow all access to contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "Allow all access to contas_bancarias" ON public.contas_bancarias FOR ALL USING (true) WITH CHECK (true);

-- contas_pagar
DROP POLICY IF EXISTS "Allow all access to contas_pagar" ON public.contas_pagar;
CREATE POLICY "Allow all access to contas_pagar" ON public.contas_pagar FOR ALL USING (true) WITH CHECK (true);

-- contas_receber
DROP POLICY IF EXISTS "Allow all access to contas_receber" ON public.contas_receber;
CREATE POLICY "Allow all access to contas_receber" ON public.contas_receber FOR ALL USING (true) WITH CHECK (true);

-- lancamentos
DROP POLICY IF EXISTS "Allow all access to lancamentos" ON public.lancamentos;
CREATE POLICY "Allow all access to lancamentos" ON public.lancamentos FOR ALL USING (true) WITH CHECK (true);

-- plano_contas
DROP POLICY IF EXISTS "Allow all access to plano_contas" ON public.plano_contas;
CREATE POLICY "Allow all access to plano_contas" ON public.plano_contas FOR ALL USING (true) WITH CHECK (true);

-- socios
DROP POLICY IF EXISTS "Allow all access to socios" ON public.socios;
CREATE POLICY "Allow all access to socios" ON public.socios FOR ALL USING (true) WITH CHECK (true);