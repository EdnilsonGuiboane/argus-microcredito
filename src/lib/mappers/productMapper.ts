// src/lib/mappers/productMapper.ts
import { LoanProduct } from '@/models/types';

type ProductRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  min_amount: number | string;
  max_amount: number | string;
  min_term_months: number;
  max_term_months: number;
  default_interest_rate: number | string;
  admin_fee_rate: number | string;
  late_penalty_rate: number | string;
  grace_period_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapProductFromDb(row: ProductRow): LoanProduct {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    minAmount: Number(row.min_amount),
    maxAmount: Number(row.max_amount),
    minTermMonths: row.min_term_months,
    maxTermMonths: row.max_term_months,
    defaultInterestRate: Number(row.default_interest_rate),
    adminFeeRate: Number(row.admin_fee_rate),
    latePenaltyRate: Number(row.late_penalty_rate),
    gracePeriodDays: row.grace_period_days,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}