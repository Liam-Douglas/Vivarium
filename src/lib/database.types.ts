// GENERATED FILE — do not edit.
//
// Produced by scripts/generate-types.mjs from the output of
// scripts/schema-dump.sql, which reads information_schema on the live
// database. Regenerate after any schema change; src/lib/schema.ts turns a
// mismatch between these types and the hand-written interfaces into a
// failed build rather than a silent runtime failure.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      acquisition_records: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          user_id: string
          acquired_at: string
          source: string | null
          source_name: string | null
          price_cents: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          user_id: string
          acquired_at: string
          source?: string | null
          source_name?: string | null
          price_cents?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          user_id?: string
          acquired_at?: string
          source?: string | null
          source_name?: string | null
          price_cents?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }
      animal_photos: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          user_id: string
          url: string
          caption: string | null
          is_primary: boolean | null
          taken_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          user_id: string
          url: string
          caption?: string | null
          is_primary?: boolean | null
          taken_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          user_id?: string
          url?: string
          caption?: string | null
          is_primary?: boolean | null
          taken_at?: string | null
          created_at?: string | null
        }
      }
      animals: {
        Row: {
          id: string
          user_id: string
          name: string
          species: string
          morph: string | null
          sex: string | null
          date_of_birth: string | null
          weight_grams: number | null
          photo_url: string | null
          notes: string | null
          feeding_frequency_days: number
          is_active: boolean
          created_at: string
          updated_at: string
          household_id: string | null
          last_fed_at: string | null
          tags: string[] | null
          quarantine_started_at: string | null
          quarantine_ended_at: string | null
          custom_fields: Json | null
          is_for_sale: boolean | null
          asking_price_cents: number | null
          enclosure_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          species: string
          morph?: string | null
          sex?: string | null
          date_of_birth?: string | null
          weight_grams?: number | null
          photo_url?: string | null
          notes?: string | null
          feeding_frequency_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          household_id?: string | null
          last_fed_at?: string | null
          tags?: string[] | null
          quarantine_started_at?: string | null
          quarantine_ended_at?: string | null
          custom_fields?: Json | null
          is_for_sale?: boolean | null
          asking_price_cents?: number | null
          enclosure_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          species?: string
          morph?: string | null
          sex?: string | null
          date_of_birth?: string | null
          weight_grams?: number | null
          photo_url?: string | null
          notes?: string | null
          feeding_frequency_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          household_id?: string | null
          last_fed_at?: string | null
          tags?: string[] | null
          quarantine_started_at?: string | null
          quarantine_ended_at?: string | null
          custom_fields?: Json | null
          is_for_sale?: boolean | null
          asking_price_cents?: number | null
          enclosure_id?: string | null
        }
      }
      breeding_records: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          user_id: string
          paired_with_id: string | null
          paired_with_name: string | null
          pairing_date: string
          outcome: string | null
          clutch_size: number | null
          eggs_fertile: number | null
          hatch_date: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          user_id: string
          paired_with_id?: string | null
          paired_with_name?: string | null
          pairing_date: string
          outcome?: string | null
          clutch_size?: number | null
          eggs_fertile?: number | null
          hatch_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          user_id?: string
          paired_with_id?: string | null
          paired_with_name?: string | null
          pairing_date?: string
          outcome?: string | null
          clutch_size?: number | null
          eggs_fertile?: number | null
          hatch_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      care_task_logs: {
        Row: {
          id: string
          household_id: string
          task_id: string
          user_id: string
          done_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          task_id: string
          user_id: string
          done_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          task_id?: string
          user_id?: string
          done_at?: string
          notes?: string | null
          created_at?: string
        }
      }
      care_tasks: {
        Row: {
          id: string
          household_id: string
          user_id: string
          name: string
          kind: string
          animal_id: string | null
          enclosure_id: string | null
          frequency_days: number
          last_done_at: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          name: string
          kind?: string
          animal_id?: string | null
          enclosure_id?: string | null
          frequency_days: number
          last_done_at?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          name?: string
          kind?: string
          animal_id?: string | null
          enclosure_id?: string | null
          frequency_days?: number
          last_done_at?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      enclosures: {
        Row: {
          id: string
          household_id: string
          user_id: string
          name: string
          type: string | null
          width_cm: number | null
          height_cm: number | null
          depth_cm: number | null
          substrate: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          name: string
          type?: string | null
          width_cm?: number | null
          height_cm?: number | null
          depth_cm?: number | null
          substrate?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          name?: string
          type?: string | null
          width_cm?: number | null
          height_cm?: number | null
          depth_cm?: number | null
          substrate?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      equipment: {
        Row: {
          id: string
          household_id: string
          enclosure_id: string | null
          user_id: string
          name: string
          equipment_type: string | null
          installed_at: string | null
          replace_every_days: number | null
          last_replaced_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          enclosure_id?: string | null
          user_id: string
          name: string
          equipment_type?: string | null
          installed_at?: string | null
          replace_every_days?: number | null
          last_replaced_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          enclosure_id?: string | null
          user_id?: string
          name?: string
          equipment_type?: string | null
          installed_at?: string | null
          replace_every_days?: number | null
          last_replaced_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      exit_records: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          user_id: string
          exited_at: string
          reason: string
          price_cents: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          user_id: string
          exited_at: string
          reason: string
          price_cents?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          user_id?: string
          exited_at?: string
          reason?: string
          price_cents?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          animal_id: string | null
          category: string
          amount_cents: number
          currency: string
          description: string | null
          expense_date: string
          source_ref_id: string | null
          created_at: string
          deleted_at: string | null
          household_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          animal_id?: string | null
          category: string
          amount_cents: number
          currency?: string
          description?: string | null
          expense_date?: string
          source_ref_id?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          animal_id?: string | null
          category?: string
          amount_cents?: number
          currency?: string
          description?: string | null
          expense_date?: string
          source_ref_id?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string | null
        }
      }
      feeder_items: {
        Row: {
          id: string
          user_id: string
          name: string
          feeder_type: string
          unit_label: string
          low_stock_threshold: number
          created_at: string
          household_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          feeder_type: string
          unit_label?: string
          low_stock_threshold?: number
          created_at?: string
          household_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          feeder_type?: string
          unit_label?: string
          low_stock_threshold?: number
          created_at?: string
          household_id?: string | null
        }
      }
      feeder_stock_events: {
        Row: {
          id: string
          feeder_item_id: string
          user_id: string
          event_type: string
          quantity_delta: number
          unit_cost: number | null
          source_ref_id: string | null
          notes: string | null
          created_at: string
          household_id: string | null
        }
        Insert: {
          id?: string
          feeder_item_id: string
          user_id: string
          event_type: string
          quantity_delta: number
          unit_cost?: number | null
          source_ref_id?: string | null
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
        Update: {
          id?: string
          feeder_item_id?: string
          user_id?: string
          event_type?: string
          quantity_delta?: number
          unit_cost?: number | null
          source_ref_id?: string | null
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
      }
      feeding_logs: {
        Row: {
          id: string
          animal_id: string
          user_id: string
          fed_at: string
          prey_type: string
          prey_size: string | null
          quantity: number
          refused: boolean
          notes: string | null
          created_at: string
          household_id: string | null
        }
        Insert: {
          id?: string
          animal_id: string
          user_id: string
          fed_at?: string
          prey_type: string
          prey_size?: string | null
          quantity?: number
          refused?: boolean
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
        Update: {
          id?: string
          animal_id?: string
          user_id?: string
          fed_at?: string
          prey_type?: string
          prey_size?: string | null
          quantity?: number
          refused?: boolean
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
      }
      health_events: {
        Row: {
          id: string
          animal_id: string
          user_id: string
          event_type: string
          event_date: string
          title: string
          notes: string | null
          cost_cents: number | null
          created_at: string
          household_id: string | null
        }
        Insert: {
          id?: string
          animal_id: string
          user_id: string
          event_type: string
          event_date?: string
          title: string
          notes?: string | null
          cost_cents?: number | null
          created_at?: string
          household_id?: string | null
        }
        Update: {
          id?: string
          animal_id?: string
          user_id?: string
          event_type?: string
          event_date?: string
          title?: string
          notes?: string | null
          cost_cents?: number | null
          created_at?: string
          household_id?: string | null
        }
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          joined_at: string
          status: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
          status?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          status?: string
        }
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          invite_code: string | null
        }
        Insert: {
          id?: string
          name?: string
          created_by: string
          created_at?: string
          invite_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          invite_code?: string | null
        }
      }
      incubations: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          breeding_record_id: string | null
          user_id: string
          clutch_size: number | null
          eggs_fertile: number | null
          start_date: string
          expected_hatch_date: string | null
          actual_hatch_date: string | null
          temperature_c: number | null
          humidity_percent: number | null
          incubation_medium: string | null
          hatchlings: number | null
          outcome: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          breeding_record_id?: string | null
          user_id: string
          clutch_size?: number | null
          eggs_fertile?: number | null
          start_date: string
          expected_hatch_date?: string | null
          actual_hatch_date?: string | null
          temperature_c?: number | null
          humidity_percent?: number | null
          incubation_medium?: string | null
          hatchlings?: number | null
          outcome?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          breeding_record_id?: string | null
          user_id?: string
          clutch_size?: number | null
          eggs_fertile?: number | null
          start_date?: string
          expected_hatch_date?: string | null
          actual_hatch_date?: string | null
          temperature_c?: number | null
          humidity_percent?: number | null
          incubation_medium?: string | null
          hatchlings?: number | null
          outcome?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      medication_logs: {
        Row: {
          id: string
          household_id: string
          schedule_id: string | null
          animal_id: string
          user_id: string
          given_at: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          schedule_id?: string | null
          animal_id: string
          user_id: string
          given_at?: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          schedule_id?: string | null
          animal_id?: string
          user_id?: string
          given_at?: string
          notes?: string | null
          created_at?: string | null
        }
      }
      medication_schedules: {
        Row: {
          id: string
          household_id: string
          animal_id: string
          user_id: string
          name: string
          dosage: string | null
          start_date: string | null
          end_date: string | null
          notes: string | null
          is_active: boolean
          created_at: string | null
          frequency_days: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          animal_id: string
          user_id: string
          name: string
          dosage?: string | null
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string | null
          frequency_days?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          animal_id?: string
          user_id?: string
          name?: string
          dosage?: string | null
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string | null
          frequency_days?: number | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          tier: string
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          tier?: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          tier?: string
          created_at?: string
        }
      }
      shedding_logs: {
        Row: {
          id: string
          animal_id: string
          user_id: string
          shed_at: string
          complete: boolean
          notes: string | null
          created_at: string
          household_id: string | null
        }
        Insert: {
          id?: string
          animal_id: string
          user_id: string
          shed_at?: string
          complete?: boolean
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
        Update: {
          id?: string
          animal_id?: string
          user_id?: string
          shed_at?: string
          complete?: boolean
          notes?: string | null
          created_at?: string
          household_id?: string | null
        }
      }
      vet_contacts: {
        Row: {
          id: string
          household_id: string
          user_id: string
          name: string
          practice_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          speciality: string | null
          notes: string | null
          is_preferred: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          name: string
          practice_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          speciality?: string | null
          notes?: string | null
          is_preferred?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          name?: string
          practice_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          speciality?: string | null
          notes?: string | null
          is_preferred?: boolean | null
          created_at?: string | null
        }
      }
      weight_logs: {
        Row: {
          id: string
          animal_id: string
          user_id: string
          weight_grams: number
          logged_at: string
          notes: string | null
          household_id: string | null
        }
        Insert: {
          id?: string
          animal_id: string
          user_id: string
          weight_grams: number
          logged_at?: string
          notes?: string | null
          household_id?: string | null
        }
        Update: {
          id?: string
          animal_id?: string
          user_id?: string
          weight_grams?: number
          logged_at?: string
          notes?: string | null
          household_id?: string | null
        }
      }
    }
  }
}

/** Convenience alias: TableRow<'animals'> is one row of public.animals. */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
