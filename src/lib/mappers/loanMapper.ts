// src/lib/mappers/loanMapper.ts
import { Loan, PaymentMethod } from '@/models/types';

type LoanRow = {
  id: string;
  tenant_id: string;
  contract_id: string;
  client_id: string;
  application_id: string;
  loan_number: string;
  principal_amount: number | string;
  interest_rate: number | string;
  term_months: number;
  monthly_payment: number | string;
  disbursed_amount: number | string;
  disbursed_at: string | null;
  disbursement_method: string | null;
  disbursement_reference: string | null;
  outstanding_principal: number | string;
  outstanding_interest: number | string;
  total_paid: number | string;
  days_overdue: number;
  next_payment_date: string | null;
  next_payment_amount: number | string | null;
  last_payment_date: string | null;
  paid_off_at: string | null;
  status: Loan['status'];
  analyst_id: string | null;
  cashier_id: string | null;
  created_at: string;
  updated_at: string;
};

export function mapLoanFromDb(row: LoanRow): Loan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    contractId: row.contract_id,
    clientId: row.client_id,
    applicationId: row.application_id,
    loanNumber: row.loan_number,
    principalAmount: Number(row.principal_amount),
    interestRate: Number(row.interest_rate),
    termMonths: row.term_months,
    monthlyPayment: Number(row.monthly_payment),
    disbursedAmount: Number(row.disbursed_amount),
    disbursedAt: row.disbursed_at ?? undefined,
    disbursementMethod: (row.disbursement_method as PaymentMethod | null) ?? undefined,
    disbursementReference: row.disbursement_reference ?? undefined,
    outstandingPrincipal: Number(row.outstanding_principal),
    outstandingInterest: Number(row.outstanding_interest),
    totalPaid: Number(row.total_paid),
    daysOverdue: row.days_overdue,
    nextPaymentDate: row.next_payment_date ?? undefined,
    nextPaymentAmount: row.next_payment_amount != null ? Number(row.next_payment_amount) : undefined,
    lastPaymentDate: row.last_payment_date ?? undefined,
    paidOffAt: row.paid_off_at ?? undefined,
    status: row.status,
    analystId: row.analyst_id ?? '',
    cashierId: row.cashier_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}