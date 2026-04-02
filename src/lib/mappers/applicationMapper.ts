// src/lib/mappers/applicationMapper.ts
import { LoanApplication } from '@/models/types';

type ApplicationRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  product_id: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  term_months: number;
  interest_rate: number | string;
  admin_fee: number | string | null;
  purpose: string;
  guarantee_type: string;
  guarantee_description: string | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  guarantor_bi: string | null;
  dti: number | string | null;
  payment_capacity: number | string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  credit_score: number | null;
  status: LoanApplication['status'];
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  approval_conditions: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assigned_analyst: string | null;
};

export function mapApplicationFromDb(row: ApplicationRow): LoanApplication {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    productId: row.product_id,
    requestedAmount: Number(row.requested_amount),
    approvedAmount:
      row.approved_amount != null ? Number(row.approved_amount) : undefined,
    termMonths: row.term_months,
    interestRate: Number(row.interest_rate),
    adminFee: Number(row.admin_fee ?? 0),
    purpose: row.purpose,
    guaranteeType: row.guarantee_type,
    guaranteeDescription: row.guarantee_description ?? undefined,
    guarantorName: row.guarantor_name ?? undefined,
    guarantorPhone: row.guarantor_phone ?? undefined,
    guarantorBi: row.guarantor_bi ?? undefined,
    dti: row.dti != null ? Number(row.dti) : undefined,
    paymentCapacity:
      row.payment_capacity != null ? Number(row.payment_capacity) : undefined,
    riskLevel: row.risk_level ?? undefined,
    creditScore: row.credit_score ?? undefined,
    status: row.status,
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    approvalConditions: row.approval_conditions ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? '',
    assignedAnalyst: row.assigned_analyst ?? undefined,
  };
}

export function mapApplicationToInsert(input: Partial<LoanApplication>) {
  return {
    tenant_id: input.tenantId,
    client_id: input.clientId,
    product_id: input.productId,
    requested_amount: input.requestedAmount,
    approved_amount: input.approvedAmount ?? null,
    term_months: input.termMonths,
    interest_rate: input.interestRate,
    admin_fee: input.adminFee ?? 0,
    purpose: input.purpose,
    guarantee_type: input.guaranteeType,
    guarantee_description: input.guaranteeDescription ?? null,
    guarantor_name: input.guarantorName ?? null,
    guarantor_phone: input.guarantorPhone ?? null,
    guarantor_bi: input.guarantorBi ?? null,
    dti: input.dti ?? null,
    payment_capacity: input.paymentCapacity ?? null,
    risk_level: input.riskLevel ?? null,
    credit_score: input.creditScore ?? null,
    status: input.status,
    submitted_at: input.submittedAt ?? null,
    reviewed_at: input.reviewedAt ?? null,
    reviewed_by: input.reviewedBy ?? null,
    rejection_reason: input.rejectionReason ?? null,
    approval_conditions: input.approvalConditions ?? null,
    created_by: input.createdBy || null,
    assigned_analyst: input.assignedAnalyst ?? null,
  };
}