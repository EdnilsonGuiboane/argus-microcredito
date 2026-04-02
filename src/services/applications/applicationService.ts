// src/services/applications/applicationService.ts
import { supabase } from '@/lib/supabase';
import {
  mapApplicationFromDb,
  mapApplicationToInsert,
} from '@/lib/mappers/applicationMapper';
import { LoanApplication } from '@/models/types';

export class ApplicationService {
  async list(): Promise<LoanApplication[]> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapApplicationFromDb);
  }

  async getById(id: string): Promise<LoanApplication | null> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapApplicationFromDb(data) : null;
  }

 async create(
        input: Omit<LoanApplication, 'id' | 'createdAt' | 'updatedAt'>
      ): Promise<LoanApplication> {
        const payload = mapApplicationToInsert(input);

        const { data, error } = await supabase
          .from('applications')
          .insert(payload)
          .select('*')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return mapApplicationFromDb(data);
      }

  async submitApplication(id: string): Promise<void> {
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async startReview(id: string): Promise<void> {
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'under_review',
        assigned_analyst: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'submitted');

    if (error) {
      console.error('SUPABASE START REVIEW ERROR:', error);
      throw new Error(error.message);
    }
  }

  async approveApplication(
    id: string,
    approvedAmount: number,
    approvalConditions?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'approved',
        approved_amount: approvedAmount,
        approval_conditions: approvalConditions ?? null,
        reviewed_at: now,
        reviewed_by: null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'under_review');

    if (error) {
      console.error('SUPABASE APPROVE ERROR:', error);
      throw new Error(error.message);
    }
  }

  async rejectApplication(id: string, reason: string): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: now,
        reviewed_by: null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'under_review');

    if (error) {
      console.error('SUPABASE REJECT ERROR:', error);
      throw new Error(error.message);
    }
  }

  async startAnalysis(id: string, analystId: string): Promise<void> {
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'under_review',
        assigned_analyst: analystId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async reject(id: string, analystId: string, reason: string): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: now,
        reviewed_by: analystId,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const applicationService = new ApplicationService();