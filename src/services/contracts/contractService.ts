// src/services/contracts/contractService.ts
import { supabase } from '@/lib/supabase';
import { mapContractFromDb } from '@/lib/mappers/contractMapper';
import { Contract, LoanApplication, LoanProduct } from '@/models/types';
import { calcService } from '@/services/calcService';

export class ContractService {
  async list(): Promise<Contract[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapContractFromDb);
  }
  async getByApplicationId(applicationId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapContractFromDb(data) : null;
}

async signContract(id: string): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: now,
      signed_by: null,
    })
    .eq('id', id)
    .in('status', ['generated', 'pending_signature']);

  if (error) {
    throw new Error(error.message);
  }
}

async markAsSigned(id: string): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

  async createFromApprovedApplication(
    application: LoanApplication,
    product: LoanProduct,
    generatedBy?: string
  ): Promise<Contract> {
    if (application.status !== 'approved') {
      throw new Error('Só é possível gerar contrato para aplicações aprovadas.');
    }

    const amount = application.approvedAmount ?? application.requestedAmount;
    const monthlyRate = application.interestRate / 100;

    const schedule = calcService.calculateAmortizationSchedule(
      amount,
      monthlyRate,
      application.termMonths
    );

    const monthlyPayment = schedule[0]?.totalAmount ?? 0;
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
    const adminFee = calcService.calculateAdminFee(amount, product.adminFeeRate);
    const totalAmount = Number((amount + totalInterest).toFixed(2));
    const netDisbursement = Number((amount - adminFee).toFixed(2));

    const contractNumber = `CTR-${new Date().getFullYear()}-${Date.now()}`;

    const payload = {
      tenant_id: application.tenantId,
      application_id: application.id,
      client_id: application.clientId,
      contract_number: contractNumber,
      principal_amount: amount,
      interest_rate: application.interestRate,
      term_months: application.termMonths,
      monthly_payment: monthlyPayment,
      total_interest: Number(totalInterest.toFixed(2)),
      total_amount: totalAmount,
      admin_fee: adminFee,
      net_disbursement: netDisbursement,
      status: 'generated',
      generated_at: new Date().toISOString(),
      generated_by: null, // por enquanto
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapContractFromDb(data);
  }
}

export const contractService = new ContractService();