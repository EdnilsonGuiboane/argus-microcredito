// src/services/loans/loanService.ts
import { supabase } from '@/lib/supabase';
import { mapLoanFromDb } from '@/lib/mappers/loanMapper';
import { Loan } from '@/models/types';

export class LoanService {
  async list(): Promise<Loan[]> {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapLoanFromDb);
  }

  async getByContractId(contractId: string): Promise<Loan | null> {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapLoanFromDb(data) : null;
  }
}

export const loanService = new LoanService();