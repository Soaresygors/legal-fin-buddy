export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      centros_custo: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          descricao: string | null
          id: string
          nome: string
          responsavel: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          descricao?: string | null
          id?: string
          nome: string
          responsavel?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          area_juridica: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_cadastro: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          socio_id: string | null
          status: string | null
          telefone: string | null
          tipo_pf_pj: string | null
        }
        Insert: {
          area_juridica?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          socio_id?: string | null
          status?: string | null
          telefone?: string | null
          tipo_pf_pj?: string | null
        }
        Update: {
          area_juridica?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          socio_id?: string | null
          status?: string | null
          telefone?: string | null
          tipo_pf_pj?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean | null
          banco: string
          conta: string | null
          id: string
          saldo_inicial: number | null
          tipo: string | null
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean | null
          banco: string
          conta?: string | null
          id?: string
          saldo_inicial?: number | null
          tipo?: string | null
        }
        Update: {
          agencia?: string | null
          ativa?: boolean | null
          banco?: string
          conta?: string | null
          id?: string
          saldo_inicial?: number | null
          tipo?: string | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          centro_custo_id: string | null
          competencia: string | null
          conta_bancaria_id: string | null
          conta_id: string | null
          created_at: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          juros_multa: number | null
          num_documento: string | null
          recorrente: boolean | null
          status: string | null
          valor_original: number
          valor_pago: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          juros_multa?: number | null
          num_documento?: string | null
          recorrente?: boolean | null
          status?: string | null
          valor_original: number
          valor_pago?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          juros_multa?: number | null
          num_documento?: string | null
          recorrente?: boolean | null
          status?: string | null
          valor_original?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          area_juridica: string | null
          cliente_id: string | null
          competencia: string | null
          conta_bancaria_id: string | null
          created_at: string | null
          data_emissao: string | null
          data_recebimento: string | null
          data_vencimento: string
          descricao: string | null
          forma_pagamento: string | null
          id: string
          juros_multa: number | null
          nf_recibo: string | null
          num_processo: string | null
          socio_id: string | null
          status: string | null
          tipo_honorario: string | null
          valor_original: number
          valor_recebido: number | null
        }
        Insert: {
          area_juridica?: string | null
          cliente_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          juros_multa?: number | null
          nf_recibo?: string | null
          num_processo?: string | null
          socio_id?: string | null
          status?: string | null
          tipo_honorario?: string | null
          valor_original: number
          valor_recebido?: number | null
        }
        Update: {
          area_juridica?: string | null
          cliente_id?: string | null
          competencia?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          juros_multa?: number | null
          nf_recibo?: string | null
          num_processo?: string | null
          socio_id?: string | null
          status?: string | null
          tipo_honorario?: string | null
          valor_original?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          area_juridica: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          competencia: string
          conta_bancaria_id: string | null
          conta_id: string
          created_at: string | null
          data_lancamento: string
          data_pagamento: string | null
          descricao: string
          forma_pagamento: string | null
          id: number
          num_documento: string | null
          num_processo: string | null
          observacoes: string | null
          parcela: string | null
          regime: string | null
          socio_id: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor_previsto: number | null
          valor_realizado: number
        }
        Insert: {
          area_juridica?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia: string
          conta_bancaria_id?: string | null
          conta_id: string
          created_at?: string | null
          data_lancamento: string
          data_pagamento?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: number
          num_documento?: string | null
          num_processo?: string | null
          observacoes?: string | null
          parcela?: string | null
          regime?: string | null
          socio_id?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_previsto?: number | null
          valor_realizado: number
        }
        Update: {
          area_juridica?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia?: string
          conta_bancaria_id?: string | null
          conta_id?: string
          created_at?: string | null
          data_lancamento?: string
          data_pagamento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: number
          num_documento?: string | null
          num_processo?: string | null
          observacoes?: string | null
          parcela?: string | null
          regime?: string | null
          socio_id?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_previsto?: number | null
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          ativo: boolean | null
          centro_custo_padrao: string | null
          codigo: string
          created_at: string | null
          descricao: string
          grupo: string
          id: string
          natureza: string | null
          subgrupo: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          centro_custo_padrao?: string | null
          codigo: string
          created_at?: string | null
          descricao: string
          grupo: string
          id?: string
          natureza?: string | null
          subgrupo?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          centro_custo_padrao?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          grupo?: string
          id?: string
          natureza?: string | null
          subgrupo?: string | null
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      socios: {
        Row: {
          area_principal: string | null
          ativo: boolean | null
          id: string
          nome: string
          oab: string | null
          participacao: number | null
        }
        Insert: {
          area_principal?: string | null
          ativo?: boolean | null
          id?: string
          nome: string
          oab?: string | null
          participacao?: number | null
        }
        Update: {
          area_principal?: string | null
          ativo?: boolean | null
          id?: string
          nome?: string
          oab?: string | null
          participacao?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
