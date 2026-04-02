// src/lib/mappers/paymentMapper.ts 
import { InstallmentPayment, PaymentMethod } from '@/models/types';

type PaymentRow = {
  id: string;
  tenant_id: string;
  loan_id: string;
  client_id: string;
  installment_number: number;
  due_date: string;
  principal_due: number | string;
  interest_due: number | string;
  penalty_due: number | string;
  total_due: number | string;
  principal_paid: number | string;
  interest_paid: number | string;
  penalty_paid: number | string;
  total_paid: number | string;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  days_overdue: number;
  status: InstallmentPayment['status'];
  processed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function mapPaymentFromDb(row: PaymentRow): InstallmentPayment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loanId: row.loan_id,
    clientId: row.client_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    principalDue: Number(row.principal_due),
    interestDue: Number(row.interest_due),
    penaltyDue: Number(row.penalty_due),
    totalDue: Number(row.total_due),
    principalPaid: Number(row.principal_paid),
    interestPaid: Number(row.interest_paid),
    penaltyPaid: Number(row.penalty_paid),
    totalPaid: Number(row.total_paid),
    paymentDate: row.payment_date ?? undefined,
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    daysOverdue: row.days_overdue,
    status: row.status,
    processedBy: row.processed_by ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}