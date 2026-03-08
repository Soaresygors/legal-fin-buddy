CREATE OR REPLACE FUNCTION verificar_migracao_por_ano()
RETURNS TABLE(ano int, qtd bigint, receitas numeric, despesas numeric, resultado numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    EXTRACT(YEAR FROM competencia)::int as ano,
    COUNT(*) as qtd,
    SUM(CASE WHEN tipo = 'R' THEN valor_realizado ELSE 0 END)::numeric(12,2) as receitas,
    SUM(CASE WHEN tipo = 'D' THEN valor_realizado ELSE 0 END)::numeric(12,2) as despesas,
    (SUM(CASE WHEN tipo = 'R' THEN valor_realizado ELSE 0 END) - 
     SUM(CASE WHEN tipo = 'D' THEN valor_realizado ELSE 0 END))::numeric(12,2) as resultado
  FROM lancamentos 
  WHERE observacoes = 'Migrado da planilha'
  GROUP BY ano 
  ORDER BY ano;
$$;