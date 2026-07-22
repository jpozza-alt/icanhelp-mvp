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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          occurred_at: string
          record_id: string | null
          table_name: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          occurred_at?: string
          record_id?: string | null
          table_name: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          occurred_at?: string
          record_id?: string | null
          table_name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      consultas: {
        Row: {
          conteudo: string | null
          created_at: string
          created_by: string
          id: string
          status: string
          tenant_id: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          created_by: string
          id?: string
          status?: string
          tenant_id: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          action_block: string | null
          answer_block: string | null
          archived_at: string | null
          archived_by: string | null
          body: string | null
          checks_block: string | null
          content_kind: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          foundation_block: string | null
          id: string
          origin_ticket_id: string | null
          published_at: string | null
          published_by: string | null
          status: string
          summary: string | null
          supersedes_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
          version_no: number
        }
        Insert: {
          action_block?: string | null
          answer_block?: string | null
          archived_at?: string | null
          archived_by?: string | null
          body?: string | null
          checks_block?: string | null
          content_kind?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          foundation_block?: string | null
          id?: string
          origin_ticket_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Update: {
          action_block?: string | null
          answer_block?: string | null
          archived_at?: string | null
          archived_by?: string | null
          body?: string | null
          checks_block?: string | null
          content_kind?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          foundation_block?: string | null
          id?: string
          origin_ticket_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_references: {
        Row: {
          consultation_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          reference_label: string
          reference_type: string
          reference_value: string
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reference_label: string
          reference_type?: string
          reference_value: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reference_label?: string
          reference_type?: string
          reference_value?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_references_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_active: boolean
          module: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          module?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      history_events: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_published: boolean
          municipality_id: string
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_published?: boolean
          municipality_id: string
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_published?: boolean
          municipality_id?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          audience: string | null
          checklist: Json | null
          created_at: string | null
          created_by: string | null
          documents: Json | null
          id: string
          legal_basis: Json | null
          sector: string | null
          summary: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audience?: string | null
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          id?: string
          legal_basis?: Json | null
          sector?: string | null
          summary?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audience?: string | null
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          id?: string
          legal_basis?: Json | null
          sector?: string | null
          summary?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          domain: string
          foundation_reference: string | null
          foundation_type: string | null
          id: string
          status: string
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain: string
          foundation_reference?: string | null
          foundation_type?: string | null
          id?: string
          status?: string
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string
          foundation_reference?: string | null
          foundation_type?: string | null
          id?: string
          status?: string
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_knowledge_items_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_articles: {
        Row: {
          article_number: string | null
          article_text: string | null
          article_title: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          law_id: string | null
        }
        Insert: {
          article_number?: string | null
          article_text?: string | null
          article_title?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          law_id?: string | null
        }
        Update: {
          article_number?: string | null
          article_text?: string | null
          article_title?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          law_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_articles_law_id_fkey"
            columns: ["law_id"]
            isOneToOne: false
            referencedRelation: "legal_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_bases: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          date: string | null
          id: string
          municipality: string | null
          number: string | null
          source_url: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          municipality?: string | null
          number?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          municipality?: string | null
          number?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: []
      }
      municipalities: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          uf: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          uf?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          uf?: string | null
        }
        Relationships: []
      }
      nr1_action_followups: {
        Row: {
          action_plan_id: string
          continuity_check: string | null
          corrective_adjustment_needed: boolean
          created_at: string
          created_by: string | null
          effectiveness_result: string | null
          environmental_monitoring_result: string | null
          execution_check: string | null
          followup_date: string
          id: string
          inspection_result: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          worker_participation_note: string | null
        }
        Insert: {
          action_plan_id: string
          continuity_check?: string | null
          corrective_adjustment_needed?: boolean
          created_at?: string
          created_by?: string | null
          effectiveness_result?: string | null
          environmental_monitoring_result?: string | null
          execution_check?: string | null
          followup_date: string
          id?: string
          inspection_result?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          worker_participation_note?: string | null
        }
        Update: {
          action_plan_id?: string
          continuity_check?: string | null
          corrective_adjustment_needed?: boolean
          created_at?: string
          created_by?: string | null
          effectiveness_result?: string | null
          environmental_monitoring_result?: string | null
          execution_check?: string | null
          followup_date?: string
          id?: string
          inspection_result?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          worker_participation_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_action_followups_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "nr1_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_action_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_action_plans: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completion_indicator: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          establishment_id: string
          evidence_method: string | null
          id: string
          measure_type: string | null
          monitoring_method: string | null
          notes: string | null
          priority: string | null
          responsible_name: string | null
          responsible_user_id: string | null
          risk_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completion_indicator?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          establishment_id: string
          evidence_method?: string | null
          id?: string
          measure_type?: string | null
          monitoring_method?: string | null
          notes?: string | null
          priority?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          risk_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completion_indicator?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          establishment_id?: string
          evidence_method?: string | null
          id?: string
          measure_type?: string | null
          monitoring_method?: string | null
          notes?: string | null
          priority?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          risk_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_action_plans_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_action_plans_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "nr1_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_action_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_activities: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string
          establishment_id: string
          execution_location: string | null
          exposed_worker_count: number | null
          frequency: string | null
          has_public_contact: boolean
          has_third_party_interaction: boolean
          id: string
          name: string
          notes: string | null
          real_activity_description: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          uses_chemical: boolean
          uses_machine: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id: string
          establishment_id: string
          execution_location?: string | null
          exposed_worker_count?: number | null
          frequency?: string | null
          has_public_contact?: boolean
          has_third_party_interaction?: boolean
          id?: string
          name: string
          notes?: string | null
          real_activity_description?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          uses_chemical?: boolean
          uses_machine?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string
          establishment_id?: string
          execution_location?: string | null
          exposed_worker_count?: number | null
          frequency?: string | null
          has_public_contact?: boolean
          has_third_party_interaction?: boolean
          id?: string
          name?: string
          notes?: string | null
          real_activity_description?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          uses_chemical?: boolean
          uses_machine?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "nr1_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nr1_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_activities_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_assessments: {
        Row: {
          action_plan_needed_flag: boolean
          activity_name: string
          change_related_flag: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          environment_description: string | null
          establishment_name: string
          existing_prevention_measures: string | null
          exposed_group_description: string
          exposure_characterization: string | null
          external_hazard_flag: boolean
          hazard_description: string
          hazard_title: string
          id: string
          immediate_action_required_flag: boolean
          monitoring_notes: string | null
          possible_injuries_or_health_effects: string
          prevention_effectiveness_notes: string | null
          probability_level: number
          process_description: string | null
          recommended_action_summary: string | null
          risk_category: string
          risk_level: string
          risk_priority: string
          risk_type: string | null
          routine_flag: boolean
          sector_name: string | null
          severity_level: number
          source_or_circumstance: string
          status: string
          tenant_id: string
          unit_name: string | null
          updated_at: string
          updated_by: string | null
          version: number
          workers_count_estimate: number | null
        }
        Insert: {
          action_plan_needed_flag?: boolean
          activity_name: string
          change_related_flag?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          environment_description?: string | null
          establishment_name: string
          existing_prevention_measures?: string | null
          exposed_group_description: string
          exposure_characterization?: string | null
          external_hazard_flag?: boolean
          hazard_description: string
          hazard_title: string
          id?: string
          immediate_action_required_flag?: boolean
          monitoring_notes?: string | null
          possible_injuries_or_health_effects: string
          prevention_effectiveness_notes?: string | null
          probability_level: number
          process_description?: string | null
          recommended_action_summary?: string | null
          risk_category: string
          risk_level: string
          risk_priority: string
          risk_type?: string | null
          routine_flag?: boolean
          sector_name?: string | null
          severity_level: number
          source_or_circumstance: string
          status?: string
          tenant_id: string
          unit_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workers_count_estimate?: number | null
        }
        Update: {
          action_plan_needed_flag?: boolean
          activity_name?: string
          change_related_flag?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          environment_description?: string | null
          establishment_name?: string
          existing_prevention_measures?: string | null
          exposed_group_description?: string
          exposure_characterization?: string | null
          external_hazard_flag?: boolean
          hazard_description?: string
          hazard_title?: string
          id?: string
          immediate_action_required_flag?: boolean
          monitoring_notes?: string | null
          possible_injuries_or_health_effects?: string
          prevention_effectiveness_notes?: string | null
          probability_level?: number
          process_description?: string | null
          recommended_action_summary?: string | null
          risk_category?: string
          risk_level?: string
          risk_priority?: string
          risk_type?: string | null
          routine_flag?: boolean
          sector_name?: string | null
          severity_level?: number
          source_or_circumstance?: string
          status?: string
          tenant_id?: string
          unit_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workers_count_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_audit_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          establishment_id: string | null
          event_type: string
          id: string
          module_name: string
          new_value_json: Json | null
          old_value_json: Json | null
          persistence_type: string
          reason: string | null
          screen_key: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          establishment_id?: string | null
          event_type: string
          id?: string
          module_name?: string
          new_value_json?: Json | null
          old_value_json?: Json | null
          persistence_type: string
          reason?: string | null
          screen_key?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          establishment_id?: string | null
          event_type?: string
          id?: string
          module_name?: string
          new_value_json?: Json | null
          old_value_json?: Json | null
          persistence_type?: string
          reason?: string | null
          screen_key?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_audit_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_companies: {
        Row: {
          cnae_main: string | null
          cnpj: string | null
          company_size: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          employee_count: number | null
          has_cipa: boolean
          has_external_activities: boolean
          has_public_service: boolean
          has_remote_work: boolean
          has_sesmt: boolean
          has_third_parties: boolean
          id: string
          legal_name: string
          risk_grade: string | null
          status: string
          tenant_id: string
          trade_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cnae_main?: string | null
          cnpj?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_count?: number | null
          has_cipa?: boolean
          has_external_activities?: boolean
          has_public_service?: boolean
          has_remote_work?: boolean
          has_sesmt?: boolean
          has_third_parties?: boolean
          id?: string
          legal_name: string
          risk_grade?: string | null
          status?: string
          tenant_id: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cnae_main?: string | null
          cnpj?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_count?: number | null
          has_cipa?: boolean
          has_external_activities?: boolean
          has_public_service?: boolean
          has_remote_work?: boolean
          has_sesmt?: boolean
          has_third_parties?: boolean
          id?: string
          legal_name?: string
          risk_grade?: string | null
          status?: string
          tenant_id?: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_company_contacts: {
        Row: {
          company_id: string
          contact_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role_title: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          contact_type: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role_title?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          contact_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role_title?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nr1_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_company_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_departments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          employee_count: number | null
          establishment_id: string
          has_deadline_pressure: boolean | null
          has_direct_leadership: boolean | null
          has_frequent_displacement: boolean | null
          has_prolonged_sitting: boolean | null
          has_public_contact: boolean | null
          has_relevant_physical_effort: boolean | null
          has_repetitive_work: boolean | null
          id: string
          name: string
          notes: string | null
          shift_pattern: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          employee_count?: number | null
          establishment_id: string
          has_deadline_pressure?: boolean | null
          has_direct_leadership?: boolean | null
          has_frequent_displacement?: boolean | null
          has_prolonged_sitting?: boolean | null
          has_public_contact?: boolean | null
          has_relevant_physical_effort?: boolean | null
          has_repetitive_work?: boolean | null
          id?: string
          name: string
          notes?: string | null
          shift_pattern?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          employee_count?: number | null
          establishment_id?: string
          has_deadline_pressure?: boolean | null
          has_direct_leadership?: boolean | null
          has_frequent_displacement?: boolean | null
          has_prolonged_sitting?: boolean | null
          has_public_contact?: boolean | null
          has_relevant_physical_effort?: boolean | null
          has_repetitive_work?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          shift_pattern?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_departments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_accidents: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          has_confined_space: boolean | null
          has_electricity: boolean | null
          has_fire_explosion: boolean | null
          has_height_fall: boolean | null
          has_hot_surfaces: boolean | null
          has_moving_parts_machine: boolean | null
          has_obvious_risk: boolean | null
          has_same_level_fall: boolean | null
          has_sharps: boolean | null
          has_vehicle_flow: boolean | null
          id: string
          immediate_date: string | null
          immediate_measure: string | null
          immediate_responsible: string | null
          notes: string | null
          obvious_risk_description: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          has_confined_space?: boolean | null
          has_electricity?: boolean | null
          has_fire_explosion?: boolean | null
          has_height_fall?: boolean | null
          has_hot_surfaces?: boolean | null
          has_moving_parts_machine?: boolean | null
          has_obvious_risk?: boolean | null
          has_same_level_fall?: boolean | null
          has_sharps?: boolean | null
          has_vehicle_flow?: boolean | null
          id?: string
          immediate_date?: string | null
          immediate_measure?: string | null
          immediate_responsible?: string | null
          notes?: string | null
          obvious_risk_description?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          has_confined_space?: boolean | null
          has_electricity?: boolean | null
          has_fire_explosion?: boolean | null
          has_height_fall?: boolean | null
          has_hot_surfaces?: boolean | null
          has_moving_parts_machine?: boolean | null
          has_obvious_risk?: boolean | null
          has_same_level_fall?: boolean | null
          has_sharps?: boolean | null
          has_vehicle_flow?: boolean | null
          id?: string
          immediate_date?: string | null
          immediate_measure?: string | null
          immediate_responsible?: string | null
          notes?: string | null
          obvious_risk_description?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_accidents_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_accidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_context: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          exposed_people_count: number | null
          has_external_work: boolean | null
          has_multi_company_interaction: boolean | null
          id: string
          incident_history: string | null
          notes: string | null
          process_changes_frequency: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          work_description: string | null
          work_routine_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          exposed_people_count?: number | null
          has_external_work?: boolean | null
          has_multi_company_interaction?: boolean | null
          id?: string
          incident_history?: string | null
          notes?: string | null
          process_changes_frequency?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
          work_routine_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          exposed_people_count?: number | null
          has_external_work?: boolean | null
          has_multi_company_interaction?: boolean | null
          id?: string
          incident_history?: string | null
          notes?: string | null
          process_changes_frequency?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
          work_routine_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_context_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_controls: {
        Row: {
          administrative_controls_description: string | null
          collective_controls_description: string | null
          controls_effectiveness: string | null
          controls_maintenance: string | null
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          has_administrative_controls: boolean | null
          has_collective_controls: boolean | null
          has_epi: boolean | null
          has_worker_guidance: boolean | null
          has_written_procedure: boolean | null
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          administrative_controls_description?: string | null
          collective_controls_description?: string | null
          controls_effectiveness?: string | null
          controls_maintenance?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          has_administrative_controls?: boolean | null
          has_collective_controls?: boolean | null
          has_epi?: boolean | null
          has_worker_guidance?: boolean | null
          has_written_procedure?: boolean | null
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          administrative_controls_description?: string | null
          collective_controls_description?: string | null
          controls_effectiveness?: string | null
          controls_maintenance?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          has_administrative_controls?: boolean | null
          has_collective_controls?: boolean | null
          has_epi?: boolean | null
          has_worker_guidance?: boolean | null
          has_written_procedure?: boolean | null
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_controls_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_controls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_ergonomics: {
        Row: {
          acoustic_discomfort: boolean | null
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          furniture_adequacy: string | null
          has_existing_aep: boolean | null
          has_forced_posture: boolean | null
          has_manual_handling: boolean | null
          has_prolonged_sitting: boolean | null
          has_prolonged_standing: boolean | null
          has_repetitive_movements: boolean | null
          id: string
          lighting_adequacy: string | null
          notes: string | null
          tenant_id: string
          thermal_discomfort: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acoustic_discomfort?: boolean | null
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          furniture_adequacy?: string | null
          has_existing_aep?: boolean | null
          has_forced_posture?: boolean | null
          has_manual_handling?: boolean | null
          has_prolonged_sitting?: boolean | null
          has_prolonged_standing?: boolean | null
          has_repetitive_movements?: boolean | null
          id?: string
          lighting_adequacy?: string | null
          notes?: string | null
          tenant_id: string
          thermal_discomfort?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acoustic_discomfort?: boolean | null
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          furniture_adequacy?: string | null
          has_existing_aep?: boolean | null
          has_forced_posture?: boolean | null
          has_manual_handling?: boolean | null
          has_prolonged_sitting?: boolean | null
          has_prolonged_standing?: boolean | null
          has_repetitive_movements?: boolean | null
          id?: string
          lighting_adequacy?: string | null
          notes?: string | null
          tenant_id?: string
          thermal_discomfort?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_ergonomics_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_ergonomics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_fqb: {
        Row: {
          created_at: string
          created_by: string | null
          details_json: Json
          diagnosis_session_id: string
          has_biological_agent: boolean | null
          has_chemical_contact: boolean | null
          has_dust_fume_gas_vapor_mist: boolean | null
          has_environmental_monitoring: boolean | null
          has_existing_control: boolean | null
          has_heat_or_cold: boolean | null
          has_noise: boolean | null
          has_vibration: boolean | null
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details_json?: Json
          diagnosis_session_id: string
          has_biological_agent?: boolean | null
          has_chemical_contact?: boolean | null
          has_dust_fume_gas_vapor_mist?: boolean | null
          has_environmental_monitoring?: boolean | null
          has_existing_control?: boolean | null
          has_heat_or_cold?: boolean | null
          has_noise?: boolean | null
          has_vibration?: boolean | null
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details_json?: Json
          diagnosis_session_id?: string
          has_biological_agent?: boolean | null
          has_chemical_contact?: boolean | null
          has_dust_fume_gas_vapor_mist?: boolean | null
          has_environmental_monitoring?: boolean | null
          has_existing_control?: boolean | null
          has_heat_or_cold?: boolean | null
          has_noise?: boolean | null
          has_vibration?: boolean | null
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_fqb_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_fqb_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_psychosocial: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          has_badly_managed_change: boolean | null
          has_communication_difficulty: boolean | null
          has_constant_interruptions: boolean | null
          has_excessive_pressure: boolean | null
          has_hostile_public_contact: boolean | null
          has_leadership_support_failure: boolean | null
          has_low_autonomy: boolean | null
          has_peer_conflict: boolean | null
          has_remote_isolation: boolean | null
          has_report_channel: boolean | null
          has_role_ambiguity: boolean | null
          has_task_accumulation: boolean | null
          has_work_overload: boolean | null
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          has_badly_managed_change?: boolean | null
          has_communication_difficulty?: boolean | null
          has_constant_interruptions?: boolean | null
          has_excessive_pressure?: boolean | null
          has_hostile_public_contact?: boolean | null
          has_leadership_support_failure?: boolean | null
          has_low_autonomy?: boolean | null
          has_peer_conflict?: boolean | null
          has_remote_isolation?: boolean | null
          has_report_channel?: boolean | null
          has_role_ambiguity?: boolean | null
          has_task_accumulation?: boolean | null
          has_work_overload?: boolean | null
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          has_badly_managed_change?: boolean | null
          has_communication_difficulty?: boolean | null
          has_constant_interruptions?: boolean | null
          has_excessive_pressure?: boolean | null
          has_hostile_public_contact?: boolean | null
          has_leadership_support_failure?: boolean | null
          has_low_autonomy?: boolean | null
          has_peer_conflict?: boolean | null
          has_remote_isolation?: boolean | null
          has_report_channel?: boolean | null
          has_role_ambiguity?: boolean | null
          has_task_accumulation?: boolean | null
          has_work_overload?: boolean | null
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_psychosocial_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_psychosocial_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_psychosocial_factors: {
        Row: {
          confidence_level: string
          created_at: string
          created_by: string | null
          diagnosis_psychosocial_id: string
          diagnosis_session_id: string
          evidence_summary: string | null
          factor_key: string
          factor_label: string
          id: string
          investigation_pending: boolean
          justification: string | null
          pending_action: string | null
          sources: Json
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          diagnosis_psychosocial_id: string
          diagnosis_session_id: string
          evidence_summary?: string | null
          factor_key: string
          factor_label: string
          id?: string
          investigation_pending?: boolean
          justification?: string | null
          pending_action?: string | null
          sources?: Json
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          diagnosis_psychosocial_id?: string
          diagnosis_session_id?: string
          evidence_summary?: string | null
          factor_key?: string
          factor_label?: string
          id?: string
          investigation_pending?: boolean
          justification?: string | null
          pending_action?: string | null
          sources?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diag_psy_factors_psychosocial_fk"
            columns: ["diagnosis_psychosocial_id", "diagnosis_session_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "nr1_diagnosis_psychosocial"
            referencedColumns: ["id", "diagnosis_session_id", "tenant_id"]
          },
          {
            foreignKeyName: "nr1_diag_psy_factors_session_fk"
            columns: ["diagnosis_session_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_psychosocial_factors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_review: {
        Row: {
          confirmed_exposed_group_json: Json
          confirmed_hazards_json: Json
          created_at: string
          created_by: string | null
          diagnosis_session_id: string
          id: string
          preliminary_priority: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comment: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          confirmed_exposed_group_json?: Json
          confirmed_hazards_json?: Json
          created_at?: string
          created_by?: string | null
          diagnosis_session_id: string
          id?: string
          preliminary_priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          confirmed_exposed_group_json?: Json
          confirmed_hazards_json?: Json
          created_at?: string
          created_by?: string | null
          diagnosis_session_id?: string
          id?: string
          preliminary_priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_review_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: true
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_review_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_diagnosis_sessions: {
        Row: {
          activity_id: string
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          current_stage: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string
          establishment_id: string
          id: string
          last_saved_at: string | null
          overall_status: string
          progress_percent: number
          reopened_at: string | null
          reopened_by: string | null
          started_at: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id: string
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id: string
          establishment_id: string
          id?: string
          last_saved_at?: string | null
          overall_status?: string
          progress_percent?: number
          reopened_at?: string | null
          reopened_by?: string | null
          started_at?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: string
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string
          establishment_id?: string
          id?: string
          last_saved_at?: string | null
          overall_status?: string
          progress_percent?: number
          reopened_at?: string | null
          reopened_by?: string | null
          started_at?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_diagnosis_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "nr1_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_sessions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nr1_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_sessions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_diagnosis_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_document_versions: {
        Row: {
          document_type: string
          establishment_id: string
          file_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          source_snapshot_json: Json
          status: string
          supersedes_document_id: string | null
          tenant_id: string
          version: number
        }
        Insert: {
          document_type: string
          establishment_id: string
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          source_snapshot_json: Json
          status?: string
          supersedes_document_id?: string | null
          tenant_id: string
          version?: number
        }
        Update: {
          document_type?: string
          establishment_id?: string
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          source_snapshot_json?: Json
          status?: string
          supersedes_document_id?: string | null
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_document_versions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_document_versions_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "nr1_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_document_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_draft_state: {
        Row: {
          created_at: string
          created_by: string | null
          establishment_id: string | null
          id: string
          is_dirty: boolean
          last_saved_at: string | null
          payload_json: Json
          record_id: string | null
          record_type: string
          saved_by: string | null
          screen_key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          establishment_id?: string | null
          id?: string
          is_dirty?: boolean
          last_saved_at?: string | null
          payload_json?: Json
          record_id?: string | null
          record_type: string
          saved_by?: string | null
          screen_key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          establishment_id?: string | null
          id?: string
          is_dirty?: boolean
          last_saved_at?: string | null
          payload_json?: Json
          record_id?: string | null
          record_type?: string
          saved_by?: string | null
          screen_key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_draft_state_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_draft_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_establishments: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj_unit: string | null
          company_id: string
          complement: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          district: string | null
          employee_count: number | null
          establishment_type: string | null
          has_external_activities: boolean
          has_third_parties: boolean
          id: string
          name: string
          notes: string | null
          number: string | null
          state: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj_unit?: string | null
          company_id: string
          complement?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          employee_count?: number | null
          establishment_type?: string | null
          has_external_activities?: boolean
          has_third_parties?: boolean
          id?: string
          name: string
          notes?: string | null
          number?: string | null
          state?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj_unit?: string | null
          company_id?: string
          complement?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          employee_count?: number | null
          establishment_type?: string | null
          has_external_activities?: boolean
          has_third_parties?: boolean
          id?: string
          name?: string
          notes?: string | null
          number?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_establishments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nr1_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_establishments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_evidence_items: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          establishment_id: string
          evidence_type: string
          file_name: string | null
          file_url: string | null
          id: string
          linked_entity_id: string
          linked_entity_type: string
          reference_date: string | null
          responsible_name: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          establishment_id: string
          evidence_type: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          linked_entity_id: string
          linked_entity_type: string
          reference_date?: string | null
          responsible_name?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
          validation_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          establishment_id?: string
          evidence_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          linked_entity_id?: string
          linked_entity_type?: string
          reference_date?: string | null
          responsible_name?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_evidence_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_evidence_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_gro_criteria: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classification_rules_json: Json
          created_at: string
          created_by: string | null
          decision_rules_json: Json
          deleted_at: string | null
          deleted_by: string | null
          establishment_id: string
          id: string
          is_active: boolean
          methodology_name: string
          probability_scale_json: Json
          risk_matrix_json: Json
          severity_scale_json: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classification_rules_json: Json
          created_at?: string
          created_by?: string | null
          decision_rules_json: Json
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id: string
          id?: string
          is_active?: boolean
          methodology_name: string
          probability_scale_json: Json
          risk_matrix_json: Json
          severity_scale_json: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classification_rules_json?: Json
          created_at?: string
          created_by?: string | null
          decision_rules_json?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id?: string
          id?: string
          is_active?: boolean
          methodology_name?: string
          probability_scale_json?: Json
          risk_matrix_json?: Json
          severity_scale_json?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_gro_criteria_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_gro_criteria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_module_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          current_status: string
          current_step: string | null
          deleted_at: string | null
          deleted_by: string | null
          establishment_id: string | null
          id: string
          last_saved_at: string | null
          pending_count: number
          progress_percent: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_status?: string
          current_step?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id?: string | null
          id?: string
          last_saved_at?: string | null
          pending_count?: number
          progress_percent?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_status?: string
          current_step?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id?: string | null
          id?: string
          last_saved_at?: string | null
          pending_count?: number
          progress_percent?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_module_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_occupational_health_refs: {
        Row: {
          accident_disease_indicators: string | null
          created_at: string
          created_by: string | null
          establishment_id: string
          has_pcmso: boolean | null
          id: string
          notes: string | null
          pcmso_valid_until: string | null
          technical_responsible: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          work_related_leave_indicators: string | null
        }
        Insert: {
          accident_disease_indicators?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id: string
          has_pcmso?: boolean | null
          id?: string
          notes?: string | null
          pcmso_valid_until?: string | null
          technical_responsible?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          work_related_leave_indicators?: string | null
        }
        Update: {
          accident_disease_indicators?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          has_pcmso?: boolean | null
          id?: string
          notes?: string | null
          pcmso_valid_until?: string | null
          technical_responsible?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          work_related_leave_indicators?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_occupational_health_refs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_occupational_health_refs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_pgr_approvals: {
        Row: {
          approval_statement: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          document_version_id: string
          establishment_id: string
          id: string
          professional_council: string | null
          professional_name: string
          professional_registration: string | null
          professional_role: string | null
          professional_state: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_snapshot_json: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_statement?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          document_version_id: string
          establishment_id: string
          id?: string
          professional_council?: string | null
          professional_name: string
          professional_registration?: string | null
          professional_role?: string | null
          professional_state?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_snapshot_json?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_statement?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          document_version_id?: string
          establishment_id?: string
          id?: string
          professional_council?: string | null
          professional_name?: string
          professional_registration?: string | null
          professional_role?: string | null
          professional_state?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_snapshot_json?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_pgr_approvals_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "nr1_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_pgr_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_review_cycles: {
        Row: {
          affected_documents_json: Json
          affected_risks_json: Json
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          status: string
          tenant_id: string
          trigger_description: string | null
          trigger_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          affected_documents_json?: Json
          affected_risks_json?: Json
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          status?: string
          tenant_id: string
          trigger_description?: string | null
          trigger_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          affected_documents_json?: Json
          affected_risks_json?: Json
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          status?: string
          tenant_id?: string
          trigger_description?: string | null
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_review_cycles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_review_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_risks: {
        Row: {
          activity_id: string
          classification: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string
          diagnosis_session_id: string | null
          establishment_id: string
          existing_controls: string | null
          exposed_group: string | null
          exposure_characterization: string | null
          hazard_description: string
          id: string
          last_review_at: string | null
          possible_harms: string | null
          probability_level: string | null
          recommended_measure: string | null
          risk_category: string
          risk_level: string | null
          severity_level: string | null
          source_circumstance: string | null
          status: string
          suggested_deadline: string | null
          suggested_responsible: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id: string
          classification?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id: string
          diagnosis_session_id?: string | null
          establishment_id: string
          existing_controls?: string | null
          exposed_group?: string | null
          exposure_characterization?: string | null
          hazard_description: string
          id?: string
          last_review_at?: string | null
          possible_harms?: string | null
          probability_level?: string | null
          recommended_measure?: string | null
          risk_category: string
          risk_level?: string | null
          severity_level?: string | null
          source_circumstance?: string | null
          status?: string
          suggested_deadline?: string | null
          suggested_responsible?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: string
          classification?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string
          diagnosis_session_id?: string | null
          establishment_id?: string
          existing_controls?: string | null
          exposed_group?: string | null
          exposure_characterization?: string | null
          hazard_description?: string
          id?: string
          last_review_at?: string | null
          possible_harms?: string | null
          probability_level?: string | null
          recommended_measure?: string | null
          risk_category?: string
          risk_level?: string | null
          severity_level?: string | null
          source_circumstance?: string | null
          status?: string
          suggested_deadline?: string | null
          suggested_responsible?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_risks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "nr1_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_risks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nr1_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_risks_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: false
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_risks_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_risks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_third_parties: {
        Row: {
          action_plan_received: boolean
          cnpj: string | null
          company_name: string
          contact_info: string | null
          contractor_risk_to_third_party: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          establishment_id: string
          id: string
          inventory_received: boolean
          notes: string | null
          provided_activity: string | null
          responsible_name: string | null
          status: string
          tenant_id: string
          third_party_risk_to_contractor: string | null
          updated_at: string
          updated_by: string | null
          work_location: string | null
        }
        Insert: {
          action_plan_received?: boolean
          cnpj?: string | null
          company_name: string
          contact_info?: string | null
          contractor_risk_to_third_party?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id: string
          id?: string
          inventory_received?: boolean
          notes?: string | null
          provided_activity?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id: string
          third_party_risk_to_contractor?: string | null
          updated_at?: string
          updated_by?: string | null
          work_location?: string | null
        }
        Update: {
          action_plan_received?: boolean
          cnpj?: string | null
          company_name?: string
          contact_info?: string | null
          contractor_risk_to_third_party?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          establishment_id?: string
          id?: string
          inventory_received?: boolean
          notes?: string | null
          provided_activity?: string | null
          responsible_name?: string | null
          status?: string
          tenant_id?: string
          third_party_risk_to_contractor?: string | null
          updated_at?: string
          updated_by?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_third_parties_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_third_parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_training_records: {
        Row: {
          certificate_file_url: string | null
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          last_date: string | null
          next_due_date: string | null
          notes: string | null
          periodicity: string | null
          responsible_name: string | null
          status: string | null
          target_audience: string | null
          tenant_id: string
          training_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certificate_file_url?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id: string
          id?: string
          last_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          periodicity?: string | null
          responsible_name?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id: string
          training_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certificate_file_url?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          last_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          periodicity?: string | null
          responsible_name?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string
          training_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_training_records_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_training_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_trigger_investigation_answers: {
        Row: {
          answer_json: Json
          answer_order: number
          answer_value: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_required: boolean
          question_key: string
          question_label: string
          tenant_id: string
          trigger_investigation_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer_json?: Json
          answer_order?: number
          answer_value?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_required?: boolean
          question_key: string
          question_label: string
          tenant_id: string
          trigger_investigation_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer_json?: Json
          answer_order?: number
          answer_value?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_required?: boolean
          question_key?: string
          question_label?: string
          tenant_id?: string
          trigger_investigation_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_trigger_investigation_answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigation_answers_trigger_investigation_id_fkey"
            columns: ["trigger_investigation_id"]
            isOneToOne: false
            referencedRelation: "nr1_trigger_investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_trigger_investigations: {
        Row: {
          activity_id: string | null
          answers_json: Json
          completed_at: string | null
          completed_by: string | null
          controls_effectiveness: string | null
          created_at: string
          created_by: string | null
          critical_alert_required: boolean
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          diagnosis_session_id: string | null
          duration: string | null
          establishment_id: string
          evidence_status: string | null
          existing_controls: string | null
          exposed_people_count: number | null
          frequency: string | null
          generated_action_plan_id: string | null
          generated_risk_id: string | null
          id: string
          initial_answer: string | null
          intensity: string | null
          investigation_status: string
          official_message_shown: boolean
          possible_harms: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          suggested_priority: string | null
          suggested_probability: string | null
          suggested_result: string | null
          suggested_severity: string | null
          technical_validation_required: boolean
          tenant_id: string
          trigger_label: string
          trigger_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          answers_json?: Json
          completed_at?: string | null
          completed_by?: string | null
          controls_effectiveness?: string | null
          created_at?: string
          created_by?: string | null
          critical_alert_required?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          diagnosis_session_id?: string | null
          duration?: string | null
          establishment_id: string
          evidence_status?: string | null
          existing_controls?: string | null
          exposed_people_count?: number | null
          frequency?: string | null
          generated_action_plan_id?: string | null
          generated_risk_id?: string | null
          id?: string
          initial_answer?: string | null
          intensity?: string | null
          investigation_status?: string
          official_message_shown?: boolean
          possible_harms?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_priority?: string | null
          suggested_probability?: string | null
          suggested_result?: string | null
          suggested_severity?: string | null
          technical_validation_required?: boolean
          tenant_id: string
          trigger_label: string
          trigger_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          answers_json?: Json
          completed_at?: string | null
          completed_by?: string | null
          controls_effectiveness?: string | null
          created_at?: string
          created_by?: string | null
          critical_alert_required?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          diagnosis_session_id?: string | null
          duration?: string | null
          establishment_id?: string
          evidence_status?: string | null
          existing_controls?: string | null
          exposed_people_count?: number | null
          frequency?: string | null
          generated_action_plan_id?: string | null
          generated_risk_id?: string | null
          id?: string
          initial_answer?: string | null
          intensity?: string | null
          investigation_status?: string
          official_message_shown?: boolean
          possible_harms?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_priority?: string | null
          suggested_probability?: string | null
          suggested_result?: string | null
          suggested_severity?: string | null
          technical_validation_required?: boolean
          tenant_id?: string
          trigger_label?: string
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_trigger_investigations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "nr1_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nr1_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_diagnosis_session_id_fkey"
            columns: ["diagnosis_session_id"]
            isOneToOne: false
            referencedRelation: "nr1_diagnosis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_generated_action_plan_id_fkey"
            columns: ["generated_action_plan_id"]
            isOneToOne: false
            referencedRelation: "nr1_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_generated_risk_id_fkey"
            columns: ["generated_risk_id"]
            isOneToOne: false
            referencedRelation: "nr1_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_trigger_investigations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_worker_participation_logs: {
        Row: {
          channel: string | null
          cipa_involved: boolean
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          participants_count: number | null
          participation_type: string
          summary: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel?: string | null
          cipa_involved?: boolean
          created_at?: string
          created_by?: string | null
          establishment_id: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          participants_count?: number | null
          participation_type: string
          summary?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: string | null
          cipa_involved?: boolean
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          participants_count?: number | null
          participation_type?: string
          summary?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_worker_participation_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_worker_participation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          is_enabled: boolean
          subscription_plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          is_enabled?: boolean
          subscription_plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          is_enabled?: boolean
          subscription_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      prefeituras: {
        Row: {
          created_at: string
          id: string
          nome: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          uf: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          municipality_id: string | null
          prefeitura_id: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          municipality_id?: string | null
          prefeitura_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          municipality_id?: string | null
          prefeitura_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_prefeitura_id_fkey"
            columns: ["prefeitura_id"]
            isOneToOne: false
            referencedRelation: "prefeituras"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_approve: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          feature_id: string
          id: string
          role_key: string
          updated_at: string
        }
        Insert: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature_id: string
          id?: string
          role_key: string
          updated_at?: string
        }
        Update: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature_id?: string
          id?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      search_events: {
        Row: {
          created_at: string | null
          id: number
          results_count: number
          term: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          results_count?: number
          term: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          results_count?: number
          term?: string
          user_id?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string | null
          id: string
          municipality_id: string
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          municipality_id: string
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          municipality_id?: string
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenant_memberships: {
        Row: {
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          expires_at: string | null
          id: string
          starts_at: string
          status: string
          subscription_plan_id: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          starts_at?: string
          status?: string
          subscription_plan_id: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          starts_at?: string
          status?: string
          subscription_plan_id?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_access_scope: {
        Row: {
          access_scope: string
          created_at: string
          department_id: string | null
          establishment_id: string | null
          id: string
          role_key: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_scope?: string
          created_at?: string
          department_id?: string | null
          establishment_id?: string | null
          id?: string
          role_key: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_scope?: string
          created_at?: string
          department_id?: string | null
          establishment_id?: string | null
          id?: string
          role_key?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_scope_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "nr1_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scope_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "nr1_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_scope_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nr1_admin_correct_diagnosis_risk_texts: {
        Args: {
          p_actor_user_id: string
          p_diagnosis_review_id: string
          p_diagnosis_session_id: string
          p_establishment_id: string
          p_expected_review_exposed_group_json: Json
          p_expected_review_updated_at: string
          p_expected_risk_exposed_group: string
          p_expected_risk_source_circumstance: string
          p_expected_risk_title: string
          p_expected_risk_updated_at: string
          p_new_review_label: string
          p_new_risk_exposed_group: string
          p_new_risk_source_circumstance: string
          p_new_risk_title: string
          p_reason: string
          p_risk_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      nr1_admin_correct_diagnosis_risk_texts_v2: {
        Args: {
          p_actor_user_id: string
          p_diagnosis_review_id: string
          p_diagnosis_session_id: string
          p_establishment_id: string
          p_expected_review_exposed_group_json: Json
          p_expected_review_updated_at: string
          p_expected_risk_exposed_group: string
          p_expected_risk_exposure_characterization: string | null
          p_expected_risk_hazard_description: string
          p_expected_risk_source_circumstance: string
          p_expected_risk_title: string
          p_expected_risk_updated_at: string
          p_new_review_label: string
          p_new_risk_exposed_group: string
          p_new_risk_exposure_characterization: string
          p_new_risk_hazard_description: string
          p_new_risk_source_circumstance: string
          p_new_risk_title: string
          p_reason: string
          p_risk_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      current_municipality_id: { Args: never; Returns: string }
      debug_get_tenant_memberships_role_constraint: {
        Args: never
        Returns: Json
      }
      debug_tickets_schema: { Args: never; Returns: Json }
      get_active_tenant_id: { Args: never; Returns: string }
      icanhelp_bootstrap_user_tenant: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      icanhelp_nr1_is_tenant_admin: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      icanhelp_nr1_is_tenant_member: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_current_tenant_admin: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      is_tenant_admin: { Args: { p_tenant: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant: string }; Returns: boolean }
    }
    Enums: {
      tenant_role: "owner" | "admin" | "member" | "viewer"
      ticket_status: "open" | "in_progress" | "closed"
      user_role: "server" | "admin" | "superadmin"
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
    Enums: {
      tenant_role: ["owner", "admin", "member", "viewer"],
      ticket_status: ["open", "in_progress", "closed"],
      user_role: ["server", "admin", "superadmin"],
    },
  },
} as const

