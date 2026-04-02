// src/lib/mappers/clientMapper.ts
import { Client } from '@/models/types';

type ClientRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'Outro';
  phone: string;
  email: string | null;
  address: string;
  district: string;
  province: string;
  bi_number: string;
  nuit: string | null;
  employer: string | null;
  occupation: string;
  monthly_income: number | string;
  monthly_expenses: number | string;
  reference1_name: string;
  reference1_phone: string;
  reference1_relationship: string;
  reference2_name: string;
  reference2_phone: string;
  reference2_relationship: string;
  notes: string | null;
  status: Client['status'];
  closed_at: string | null;
  closed_reason: string | null;
  closed_by: string | null;
  locked_at: string | null;
  lock_reason: string | null;
  locked_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejected_by: string | null;
  withdrawn_at: string | null;
  withdrawal_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export function mapClientFromDb(row: ClientRow): Client {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    phone: row.phone,
    email: row.email ?? undefined,
    address: row.address,
    district: row.district,
    province: row.province,
    biNumber: row.bi_number,
    nuit: row.nuit ?? undefined,
    employer: row.employer ?? undefined,
    occupation: row.occupation,
    monthlyIncome: Number(row.monthly_income),
    monthlyExpenses: Number(row.monthly_expenses),
    reference1: {
      name: row.reference1_name,
      phone: row.reference1_phone,
      relationship: row.reference1_relationship,
    },
    reference2: {
      name: row.reference2_name,
      phone: row.reference2_phone,
      relationship: row.reference2_relationship,
    },
    notes: row.notes ?? undefined,
    status: row.status,
    closedAt: row.closed_at ?? undefined,
    closedReason: row.closed_reason ?? undefined,
    closedBy: row.closed_by ?? undefined,
    lockedAt: row.locked_at ?? undefined,
    lockReason: row.lock_reason ?? undefined,
    lockedBy: row.locked_by ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    rejectedBy: row.rejected_by ?? undefined,
    withdrawnAt: row.withdrawn_at ?? undefined,
    withdrawalReason: row.withdrawal_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}