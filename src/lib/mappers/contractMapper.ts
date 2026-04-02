// src/lib/mappers/contractMapper.ts
import { Contract } from '@/models/types';

type ContractRow = {
  id: string;
  tenant_id: string;
  application_id: string;
  client_id: string;
  contract_number: string;
  principal_amount: number | string;
  interest_rate: number | string;
  term_months: number;
  monthly_payment: number | string;
  total_interest: number | string;
  total_amount: number | string;
  admin_fee: number | string;
  net_disbursement: number | string;
  status: Contract['status'];
  generated_at: string | null;
  generated_by: string | null;
  signed_at: string | null;
  signed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
};

export function mapContractFromDb(row: ContractRow): Contract {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationId: row.application_id,
    clientId: row.client_id,
    contractNumber: row.contract_number,
    principalAmount: Number(row.principal_amount),
    interestRate: Number(row.interest_rate),
    termMonths: row.term_months,
    monthlyPayment: Number(row.monthly_payment),
    totalInterest: Number(row.total_interest),
    totalAmount: Number(row.total_amount),
    adminFee: Number(row.admin_fee),
    netDisbursement: Number(row.net_disbursement),
    status: row.status,
    generatedAt: row.generated_at ?? undefined,
    generatedBy: row.generated_by ?? undefined,
    signedAt: row.signed_at ?? undefined,
    signedBy: row.signed_by ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdAt: row.created_at,
  };
}