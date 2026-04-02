// src/services/disbursements/disbursementService.ts
import { supabase } from '@/lib/supabase';
import { mapDisbursementFromDb } from '@/lib/mappers/disbursementMapper';
import { Contract, Disbursement, PaymentMethod } from '@/models/types';
import { loanService } from '@/services/loans/loanService';

export class DisbursementService {
  async list(): Promise<Disbursement[]> {
    const { data, error } = await supabase
      .from('disbursements')
      .select('*')
      .order('disbursed_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapDisbursementFromDb);
  }

  async disburseContract(
    contract: Contract,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ): Promise<{ loan: unknown; disbursement: Disbursement }> {
    const existingLoan = await loanService.getByContractId(contract.id);
    if (existingLoan) {
      throw new Error('Este contrato já foi desembolsado.');
    }

    const now = new Date().toISOString();
    const loanNumber = `EMP-${new Date().getFullYear()}-${Date.now()}`;

    const loanPayload = {
      tenant_id: contract.tenantId,
      contract_id: contract.id,
      client_id: contract.clientId,
      application_id: contract.applicationId,
      loan_number: loanNumber,
      principal_amount: contract.principalAmount,
      interest_rate: contract.interestRate,
      term_months: contract.termMonths,
      monthly_payment: contract.monthlyPayment,
      disbursed_amount: contract.netDisbursement,
      disbursed_at: now,
      disbursement_method: method,
      disbursement_reference: reference ?? null,
      outstanding_principal: contract.principalAmount,
      outstanding_interest: contract.totalInterest,
      total_paid: 0,
      days_overdue: 0,
      next_payment_amount: contract.monthlyPayment,
      status: 'active',
      analyst_id: null,
      cashier_id: null,
      created_at: now,
      updated_at: now,
    };

    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .insert(loanPayload)
      .select('*')
      .single();

    if (loanError) {
      throw new Error(loanError.message);
    }

    const disbursementPayload = {
      tenant_id: contract.tenantId,
      loan_id: loanData.id,
      contract_id: contract.id,
      client_id: contract.clientId,
      gross_amount: contract.principalAmount,
      admin_fee: contract.adminFee,
      net_amount: contract.netDisbursement,
      method,
      reference: reference ?? null,
      disbursed_at: now,
      processed_by: null,
      notes: notes ?? null,
    };

    const { data: disbursementData, error: disbursementError } = await supabase
      .from('disbursements')
      .insert(disbursementPayload)
      .select('*')
      .single();

    if (disbursementError) {
      throw new Error(disbursementError.message);
    }

    

    return {
      loan: loanData,
      disbursement: mapDisbursementFromDb(disbursementData),
    };
  }
}

export const disbursementService = new DisbursementService();