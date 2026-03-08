import { supabase } from '@/integrations/supabase/client';

export interface ImportResult {
  success: number;
  errors: string[];
}

function toBool(val: string): boolean {
  return !val || val.toLowerCase() === 'true' || val === '1';
}

function toNumberOrNull(val: string): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

export async function importSocios(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.nome) { result.errors.push(`Linha ${i + 2}: nome é obrigatório`); continue; }
    const { error } = await supabase.from('socios').insert({
      nome: r.nome,
      oab: r.oab || null,
      area_principal: r.area_principal || null,
      participacao: toNumberOrNull(r.participacao),
      ativo: toBool(r.ativo),
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}

export async function importCentrosCusto(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.nome) { result.errors.push(`Linha ${i + 2}: nome é obrigatório`); continue; }
    const { error } = await supabase.from('centros_custo').insert({
      codigo: r.codigo || null,
      nome: r.nome,
      descricao: r.descricao || null,
      responsavel: r.responsavel || null,
      ativo: toBool(r.ativo),
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}

export async function importContasBancarias(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.banco) { result.errors.push(`Linha ${i + 2}: banco é obrigatório`); continue; }
    const { error } = await supabase.from('contas_bancarias').insert({
      banco: r.banco,
      agencia: r.agencia || null,
      conta: r.conta || null,
      tipo: r.tipo || null,
      saldo_inicial: toNumberOrNull(r.saldo_inicial) ?? 0,
      ativa: toBool(r.ativa),
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}

export async function importPlanoContas(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.codigo || !r.descricao || !r.tipo || !r.grupo) {
      result.errors.push(`Linha ${i + 2}: codigo, descricao, tipo e grupo são obrigatórios`);
      continue;
    }
    const { error } = await supabase.from('plano_contas').insert({
      codigo: r.codigo,
      descricao: r.descricao,
      tipo: r.tipo.toUpperCase(),
      grupo: r.grupo,
      subgrupo: r.subgrupo || null,
      natureza: r.natureza || null,
      ativo: toBool(r.ativo),
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}

export async function importClientes(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.nome) { result.errors.push(`Linha ${i + 2}: nome é obrigatório`); continue; }
    const { error } = await supabase.from('clientes').insert({
      nome: r.nome,
      cpf_cnpj: r.cpf_cnpj || null,
      tipo_pf_pj: r.tipo_pf_pj || null,
      email: r.email || null,
      telefone: r.telefone || null,
      area_juridica: r.area_juridica || null,
      status: r.status || 'Ativo',
      observacoes: r.observacoes || null,
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}

export async function importLancamentos(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, errors: [] };

  // Pre-fetch lookup tables
  const [contasRes, clientesRes, sociosRes, centrosRes] = await Promise.all([
    supabase.from('plano_contas').select('id, codigo'),
    supabase.from('clientes').select('id, nome'),
    supabase.from('socios').select('id, nome'),
    supabase.from('centros_custo').select('id, codigo'),
  ]);

  const contasMap = new Map((contasRes.data ?? []).map(c => [c.codigo, c.id]));
  const clientesMap = new Map((clientesRes.data ?? []).map(c => [c.nome.toLowerCase(), c.id]));
  const sociosMap = new Map((sociosRes.data ?? []).map(s => [s.nome.toLowerCase(), s.id]));
  const centrosMap = new Map((centrosRes.data ?? []).map(c => [c.codigo ?? '', c.id]));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    if (!r.tipo || !r.descricao || !r.valor_realizado || !r.competencia || !r.data_lancamento || !r.conta_codigo) {
      result.errors.push(`Linha ${i + 2}: campos obrigatórios faltando (tipo, descricao, valor_realizado, competencia, data_lancamento, conta_codigo)`);
      continue;
    }

    const contaId = contasMap.get(r.conta_codigo);
    if (!contaId) {
      result.errors.push(`Linha ${i + 2}: conta_codigo "${r.conta_codigo}" não encontrada no plano de contas`);
      continue;
    }

    const clienteId = r.cliente_nome ? clientesMap.get(r.cliente_nome.toLowerCase()) ?? null : null;
    if (r.cliente_nome && !clienteId) {
      result.errors.push(`Linha ${i + 2}: cliente "${r.cliente_nome}" não encontrado (ignorando vínculo)`);
    }

    const socioId = r.socio_nome ? sociosMap.get(r.socio_nome.toLowerCase()) ?? null : null;
    const centroCustoId = r.centro_custo_codigo ? centrosMap.get(r.centro_custo_codigo) ?? null : null;

    const { error } = await supabase.from('lancamentos').insert({
      tipo: r.tipo.toUpperCase(),
      descricao: r.descricao,
      valor_realizado: parseFloat(r.valor_realizado.replace(',', '.')),
      valor_previsto: toNumberOrNull(r.valor_previsto),
      competencia: r.competencia,
      data_lancamento: r.data_lancamento,
      data_pagamento: r.data_pagamento || null,
      conta_id: contaId,
      cliente_id: clienteId,
      socio_id: socioId,
      centro_custo_id: centroCustoId,
      forma_pagamento: r.forma_pagamento || null,
      num_documento: r.num_documento || null,
      status: r.status || 'Pago',
      observacoes: r.observacoes || null,
    });
    if (error) result.errors.push(`Linha ${i + 2}: ${error.message}`);
    else result.success++;
  }
  return result;
}
