// src/lib/mappers/disbursementMapper.ts
import { Disbursement, PaymentMethod } from '@/models/types';

type DisbursementRow = {
  id: string;
  tenant_id: string;
  loan_id: string;
  contract_id: string;
  client_id: string;
  gross_amount: number | string;
  admin_fee: number | string;
  net_amount: number | string;
  method: string;
  reference: string | null;
  disbursed_at: string;
  processed_by: string | null;
  notes: string | null;
};

export function mapDisbursementFromDb(row: DisbursementRow): Disbursement {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loanId: row.loan_id,
    contractId: row.contract_id,
    clientId: row.client_id,
    grossAmount: Number(row.gross_amount),
    adminFee: Number(row.admin_fee),
    netAmount: Number(row.net_amount),
    method: row.method as PaymentMethod,
    reference: row.reference ?? undefined,
    disbursedAt: row.disbursed_at,
    processedBy: row.processed_by ?? '',
    notes: row.notes ?? undefined,
    createdAt: row.disbursed_at,
  };
}