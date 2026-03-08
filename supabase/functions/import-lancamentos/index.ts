import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { csvText } = await req.json();
    if (!csvText) {
      return new Response(JSON.stringify({ error: "csvText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse CSV
    const clean = csvText.replace(/^\uFEFF/, "").trim();
    const lines = clean.split(/\r?\n/).filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: "Empty CSV" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = lines[0].split(";").map((h: string) => h.trim().toLowerCase());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";");
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => {
        row[h] = (values[idx] ?? "").trim();
      });
      rows.push(row);
    }

    // Fetch lookup tables
    const [contasRes, clientesRes, sociosRes, centrosRes] = await Promise.all([
      supabase.from("plano_contas").select("id, codigo"),
      supabase.from("clientes").select("id, nome"),
      supabase.from("socios").select("id, nome"),
      supabase.from("centros_custo").select("id, codigo"),
    ]);

    const contasMap = new Map((contasRes.data ?? []).map((c: any) => [c.codigo, c.id]));
    const clientesMap = new Map((clientesRes.data ?? []).map((c: any) => [c.nome.toLowerCase(), c.id]));
    const sociosMap = new Map((sociosRes.data ?? []).map((s: any) => [s.nome.toLowerCase(), s.id]));
    const centrosMap = new Map((centrosRes.data ?? []).map((c: any) => [c.codigo ?? "", c.id]));

    let success = 0;
    const errors: string[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let batchStart = 0; batchStart < rows.length; batchStart += batchSize) {
      const batch = rows.slice(batchStart, batchStart + batchSize);
      const insertRows: any[] = [];

      for (let j = 0; j < batch.length; j++) {
        const i = batchStart + j;
        const r = batch[j];

        if (!r.tipo || !r.descricao || !r.valor_realizado || !r.competencia || !r.data_lancamento || !r.conta_codigo) {
          errors.push(`Linha ${i + 2}: campos obrigatórios faltando`);
          continue;
        }

        const contaId = contasMap.get(r.conta_codigo);
        if (!contaId) {
          errors.push(`Linha ${i + 2}: conta_codigo "${r.conta_codigo}" não encontrada`);
          continue;
        }

        const clienteId = r.cliente_nome ? clientesMap.get(r.cliente_nome.toLowerCase()) ?? null : null;
        const socioId = r.socio_nome ? sociosMap.get(r.socio_nome.toLowerCase()) ?? null : null;
        const centroCustoId = r.centro_custo_codigo ? centrosMap.get(r.centro_custo_codigo) ?? null : null;

        insertRows.push({
          tipo: r.tipo.toUpperCase(),
          descricao: r.descricao,
          valor_realizado: parseFloat(r.valor_realizado.replace(",", ".")),
          valor_previsto: r.valor_previsto ? parseFloat(r.valor_previsto.replace(",", ".")) : null,
          competencia: r.competencia,
          data_lancamento: r.data_lancamento,
          data_pagamento: r.data_pagamento || null,
          conta_id: contaId,
          cliente_id: clienteId,
          socio_id: socioId,
          centro_custo_id: centroCustoId,
          forma_pagamento: r.forma_pagamento || null,
          num_documento: r.num_documento || null,
          status: r.status || "Pago",
          observacoes: r.observacoes || null,
        });
      }

      if (insertRows.length > 0) {
        const { error, data } = await supabase.from("lancamentos").insert(insertRows).select("id");
        if (error) {
          errors.push(`Lote ${Math.floor(batchStart / batchSize) + 1}: ${error.message}`);
        } else {
          success += (data?.length ?? 0);
        }
      }
    }

    return new Response(JSON.stringify({ success, errors, total: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
