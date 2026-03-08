
-- Plano de Contas
CREATE TABLE public.plano_contas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  grupo VARCHAR(50) NOT NULL,
  subgrupo VARCHAR(50),
  descricao VARCHAR(100) NOT NULL,
  tipo VARCHAR(1) NOT NULL CHECK (tipo IN ('R', 'D')),
  natureza VARCHAR(30),
  centro_custo_padrao VARCHAR(30),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to plano_contas" ON public.plano_contas FOR ALL USING (true) WITH CHECK (true);

-- Socios
CREATE TABLE public.socios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  oab VARCHAR(30),
  participacao DECIMAL(5,2),
  area_principal VARCHAR(30),
  ativo BOOLEAN DEFAULT true
);

ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to socios" ON public.socios FOR ALL USING (true) WITH CHECK (true);

-- Centros de Custo
CREATE TABLE public.centros_custo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10),
  nome VARCHAR(50) NOT NULL,
  descricao TEXT,
  responsavel VARCHAR(50),
  ativo BOOLEAN DEFAULT true
);

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to centros_custo" ON public.centros_custo FOR ALL USING (true) WITH CHECK (true);

-- Contas Bancarias
CREATE TABLE public.contas_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banco VARCHAR(50) NOT NULL,
  agencia VARCHAR(20),
  conta VARCHAR(20),
  tipo VARCHAR(20),
  saldo_inicial DECIMAL(12,2) DEFAULT 0,
  ativa BOOLEAN DEFAULT true
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contas_bancarias" ON public.contas_bancarias FOR ALL USING (true) WITH CHECK (true);

-- Clientes
CREATE TABLE public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf_cnpj VARCHAR(20),
  tipo_pf_pj VARCHAR(2) CHECK (tipo_pf_pj IN ('PF', 'PJ')),
  telefone VARCHAR(20),
  email VARCHAR(100),
  area_juridica VARCHAR(30),
  socio_id UUID REFERENCES public.socios(id),
  status VARCHAR(10) DEFAULT 'Ativo',
  data_cadastro DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

-- Lancamentos
CREATE TABLE public.lancamentos (
  id SERIAL PRIMARY KEY,
  data_lancamento DATE NOT NULL,
  competencia DATE NOT NULL,
  tipo VARCHAR(1) NOT NULL CHECK (tipo IN ('R', 'D')),
  conta_id UUID NOT NULL REFERENCES public.plano_contas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  num_processo VARCHAR(50),
  area_juridica VARCHAR(30),
  socio_id UUID REFERENCES public.socios(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  descricao TEXT NOT NULL,
  valor_previsto DECIMAL(12,2),
  valor_realizado DECIMAL(12,2) NOT NULL,
  data_pagamento DATE,
  forma_pagamento VARCHAR(30),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  num_documento VARCHAR(50),
  status VARCHAR(15) DEFAULT 'Pago',
  regime VARCHAR(15) DEFAULT 'Caixa',
  parcela VARCHAR(10),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to lancamentos" ON public.lancamentos FOR ALL USING (true) WITH CHECK (true);

-- Contas a Receber
CREATE TABLE public.contas_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_emissao DATE,
  data_vencimento DATE NOT NULL,
  competencia DATE,
  cliente_id UUID REFERENCES public.clientes(id),
  num_processo VARCHAR(50),
  area_juridica VARCHAR(30),
  tipo_honorario VARCHAR(30),
  descricao TEXT,
  valor_original DECIMAL(12,2) NOT NULL,
  juros_multa DECIMAL(12,2) DEFAULT 0,
  valor_recebido DECIMAL(12,2) DEFAULT 0,
  data_recebimento DATE,
  forma_pagamento VARCHAR(30),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  nf_recibo VARCHAR(30),
  status VARCHAR(15) DEFAULT 'Pendente',
  socio_id UUID REFERENCES public.socios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contas_receber" ON public.contas_receber FOR ALL USING (true) WITH CHECK (true);

-- Contas a Pagar
CREATE TABLE public.contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_emissao DATE,
  data_vencimento DATE NOT NULL,
  competencia DATE,
  fornecedor VARCHAR(100),
  conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  descricao TEXT,
  valor_original DECIMAL(12,2) NOT NULL,
  desconto DECIMAL(12,2) DEFAULT 0,
  juros_multa DECIMAL(12,2) DEFAULT 0,
  valor_pago DECIMAL(12,2) DEFAULT 0,
  data_pagamento DATE,
  forma_pagamento VARCHAR(30),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  num_documento VARCHAR(50),
  status VARCHAR(15) DEFAULT 'Pendente',
  recorrente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contas_pagar" ON public.contas_pagar FOR ALL USING (true) WITH CHECK (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
