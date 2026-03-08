export interface PlanoContas {
  id: string;
  codigo: string;
  grupo: string;
  subgrupo: string | null;
  descricao: string;
  tipo: 'R' | 'D';
  natureza: string | null;
  centro_custo_padrao: string | null;
  ativo: boolean;
}

export interface Socio {
  id: string;
  nome: string;
  oab: string | null;
  participacao: number | null;
  area_principal: string | null;
  ativo: boolean;
}

export interface CentroCusto {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  responsavel: string | null;
  ativo: boolean;
}

export interface ContaBancaria {
  id: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string | null;
  saldo_inicial: number;
  ativa: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  tipo_pf_pj: string | null;
  telefone: string | null;
  email: string | null;
  area_juridica: string | null;
  socio_id: string | null;
  status: string | null;
  observacoes: string | null;
  data_cadastro: string | null;
  socios?: { nome: string } | null;
}

export interface Lancamento {
  id: number;
  data_lancamento: string;
  competencia: string;
  tipo: 'R' | 'D';
  conta_id: string;
  cliente_id: string | null;
  num_processo: string | null;
  area_juridica: string | null;
  socio_id: string | null;
  centro_custo_id: string | null;
  descricao: string;
  valor_previsto: number | null;
  valor_realizado: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  num_documento: string | null;
  status: string;
  regime: string;
  parcela: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  plano_contas?: PlanoContas | null;
  clientes?: { nome: string } | null;
  socios?: { nome: string } | null;
  centros_custo?: { nome: string } | null;
}

export interface ContaReceber {
  id: string;
  data_emissao: string | null;
  data_vencimento: string;
  competencia: string | null;
  cliente_id: string | null;
  num_processo: string | null;
  area_juridica: string | null;
  tipo_honorario: string | null;
  descricao: string | null;
  valor_original: number;
  juros_multa: number;
  valor_recebido: number;
  data_recebimento: string | null;
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  nf_recibo: string | null;
  status: string;
  socio_id: string | null;
  clientes?: { nome: string } | null;
  socios?: { nome: string } | null;
}

export interface ContaPagar {
  id: string;
  data_emissao: string | null;
  data_vencimento: string;
  competencia: string | null;
  fornecedor: string | null;
  conta_id: string | null;
  centro_custo_id: string | null;
  descricao: string | null;
  valor_original: number;
  desconto: number;
  juros_multa: number;
  valor_pago: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  num_documento: string | null;
  status: string;
  recorrente: boolean;
  plano_contas?: { codigo: string; descricao: string } | null;
  centros_custo?: { nome: string } | null;
}
