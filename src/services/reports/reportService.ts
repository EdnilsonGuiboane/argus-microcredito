import { supabase } from '@/lib/supabase';
import { LoanApplication, LoanProduct, PaymentMethod, UserRole } from '@/models/types';

export type ReportUser = {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReportClient = {
  id: string;
  tenantId: string;
  fullName: string;
  biNumber: string;
  phone: string;
  province: string;
  district: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  status: string;
};

export type ReportLoan = {
  id: string;
  tenantId: string;
  clientId: string;
  applicationId?: string;
  analystId?: string;
  loanNumber: string;
  principalAmount: number;
  outstandingPrincipal: number;
  status: string;
  daysOverdue: number;
  nextPaymentDate?: string;
  createdAt: string;
};

export type ReportPayment = {
  id: string;
  tenantId: string;
  clientId: string;
  loanId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod | string;
  receiptNumber?: string;
  reversed?: boolean;
};

export type ReportDisbursement = {
  id: string;
  tenantId: string;
  clientId: string;
  loanId: string;
  grossAmount: number;
  adminFee: number;
  netAmount: number;
  method: string;
  reference?: string;
  disbursedAt: string;
};

export type PortfolioStats = {
  totalActiveLoans: number;
  totalOverdueLoans: number;
  totalActiveAmount: number;
  totalOverdueAmount: number;
  delinquencyRate: number;
  agingBuckets: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
};

export type ReportsDataset = {
  loans: ReportLoan[];
  payments: ReportPayment[];
  disbursements: ReportDisbursement[];
  clients: ReportClient[];
  users: ReportUser[];
  products: LoanProduct[];
  applications: LoanApplication[];
};

type LoanRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  application_id: string | null;
  analyst_id: string | null;
  loan_number: string;
  principal_amount: number | string;
  outstanding_principal: number | string;
  status: string;
  days_overdue: number | null;
  next_payment_date: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  loan_id: string;
  total_paid: number | string | null;
  principal_paid: number | string | null;
  interest_paid: number | string | null;
  penalty_paid: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  reversed: boolean | null;
};

type DisbursementRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  loan_id: string;
  gross_amount: number | string;
  admin_fee: number | string | null;
  net_amount: number | string;
  method: string | null;
  reference: string | null;
  disbursed_at: string;
};

type ClientRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  bi_number: string;
  phone: string;
  province: string;
  district: string;
  monthly_income: number | string;
  monthly_expenses: number | string;
  status: string;
};

type UserRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UserRoleAssignmentRow = {
  user_id: string;
  role: UserRole;
};

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
  created_by: string;
  assigned_analyst: string | null;
};

function mapLoan(row: LoanRow): ReportLoan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    applicationId: row.application_id ?? undefined,
    analystId: row.analyst_id ?? undefined,
    loanNumber: row.loan_number,
    principalAmount: Number(row.principal_amount || 0),
    outstandingPrincipal: Number(row.outstanding_principal || 0),
    status: row.status,
    daysOverdue: Number(row.days_overdue || 0),
    nextPaymentDate: row.next_payment_date ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPayment(row: PaymentRow): ReportPayment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    loanId: row.loan_id,
    amount: Number(row.total_paid || 0),
    principalPaid: Number(row.principal_paid || 0),
    interestPaid: Number(row.interest_paid || 0),
    penaltyPaid: Number(row.penalty_paid || 0),
    paymentDate: row.payment_date || '',
    paymentMethod: row.payment_method || 'cash',
    receiptNumber: row.payment_reference ?? undefined,
    reversed: row.reversed ?? false,
  };
}

function mapDisbursement(row: DisbursementRow): ReportDisbursement {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    loanId: row.loan_id,
    grossAmount: Number(row.gross_amount || 0),
    adminFee: Number(row.admin_fee || 0),
    netAmount: Number(row.net_amount || 0),
    method: row.method || 'manual',
    reference: row.reference ?? undefined,
    disbursedAt: row.disbursed_at,
  };
}

function mapClient(row: ClientRow): ReportClient {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    biNumber: row.bi_number,
    phone: row.phone,
    province: row.province,
    district: row.district,
    monthlyIncome: Number(row.monthly_income || 0),
    monthlyExpenses: Number(row.monthly_expenses || 0),
    status: row.status,
  };
}

function mapProduct(row: ProductRow): LoanProduct {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    minAmount: Number(row.min_amount || 0),
    maxAmount: Number(row.max_amount || 0),
    minTermMonths: row.min_term_months,
    maxTermMonths: row.max_term_months,
    defaultInterestRate: Number(row.default_interest_rate || 0),
    adminFeeRate: Number(row.admin_fee_rate || 0),
    latePenaltyRate: Number(row.late_penalty_rate || 0),
    gracePeriodDays: row.grace_period_days,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplication(row: ApplicationRow): LoanApplication {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    productId: row.product_id,
    requestedAmount: Number(row.requested_amount || 0),
    approvedAmount: row.approved_amount != null ? Number(row.approved_amount) : undefined,
    termMonths: row.term_months,
    interestRate: Number(row.interest_rate || 0),
    adminFee: Number(row.admin_fee || 0),
    purpose: row.purpose,
    guaranteeType: row.guarantee_type,
    guaranteeDescription: row.guarantee_description ?? undefined,
    guarantorName: row.guarantor_name ?? undefined,
    guarantorPhone: row.guarantor_phone ?? undefined,
    guarantorBi: row.guarantor_bi ?? undefined,
    dti: row.dti != null ? Number(row.dti) : undefined,
    paymentCapacity: row.payment_capacity != null ? Number(row.payment_capacity) : undefined,
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
    createdBy: row.created_by,
    assignedAnalyst: row.assigned_analyst ?? undefined,
  };
}

export class ReportService {
  async loadAll(tenantId: string): Promise<ReportsDataset> {
    const [
      loansRes,
      paymentsRes,
      disbursementsRes,
      clientsRes,
      usersRes,
      rolesRes,
      productsRes,
      applicationsRes,
    ] = await Promise.all([
      supabase.from('loans').select('*').eq('tenant_id', tenantId),
      supabase.from('payments').select('*').eq('tenant_id', tenantId),
      supabase.from('disbursements').select('*').eq('tenant_id', tenantId),
      supabase.from('clients').select('*').eq('tenant_id', tenantId),
      supabase.from('users').select('*').eq('tenant_id', tenantId),
      supabase.from('user_role_assignments').select('user_id, role').eq('tenant_id', tenantId),
      supabase.from('loan_products').select('*').eq('tenant_id', tenantId),
      supabase.from('applications').select('*').eq('tenant_id', tenantId),
    ]);

    const errors = [
      loansRes.error,
      paymentsRes.error,
      disbursementsRes.error,
      clientsRes.error,
      usersRes.error,
      rolesRes.error,
      productsRes.error,
      applicationsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(errors[0]?.message || 'Erro ao carregar relatórios.');
    }

    const roleMap = new Map<string, UserRole>();
    ((rolesRes.data as UserRoleAssignmentRow[] | null) ?? []).forEach((r) => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
    });

    const users: ReportUser[] = ((usersRes.data as UserRow[] | null) ?? []).map((u) => ({
      id: u.id,
      tenantId: u.tenant_id,
      fullName: u.full_name,
      email: u.email,
      role: roleMap.get(u.id) || 'analyst',
      isActive: u.is_active,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return {
      loans: ((loansRes.data as LoanRow[] | null) ?? []).map(mapLoan),
      payments: ((paymentsRes.data as PaymentRow[] | null) ?? []).map(mapPayment),
      disbursements: ((disbursementsRes.data as DisbursementRow[] | null) ?? []).map(mapDisbursement),
      clients: ((clientsRes.data as ClientRow[] | null) ?? []).map(mapClient),
      users,
      products: ((productsRes.data as ProductRow[] | null) ?? []).map(mapProduct),
      applications: ((applicationsRes.data as ApplicationRow[] | null) ?? []).map(mapApplication),
    };
  }

  getPortfolioStats(loans: ReportLoan[]): PortfolioStats {
    const activeLoans = loans.filter((l) => ['active', 'overdue'].includes(l.status));
    const overdueLoans = activeLoans.filter((l) => l.daysOverdue > 0);

    const agingBuckets = {
      current: activeLoans
        .filter((l) => l.daysOverdue === 0)
        .reduce((sum, l) => sum + l.outstandingPrincipal, 0),
      days1_30: activeLoans
        .filter((l) => l.daysOverdue > 0 && l.daysOverdue <= 30)
        .reduce((sum, l) => sum + l.outstandingPrincipal, 0),
      days31_60: activeLoans
        .filter((l) => l.daysOverdue > 30 && l.daysOverdue <= 60)
        .reduce((sum, l) => sum + l.outstandingPrincipal, 0),
      days61_90: activeLoans
        .filter((l) => l.daysOverdue > 60 && l.daysOverdue <= 90)
        .reduce((sum, l) => sum + l.outstandingPrincipal, 0),
      days90Plus: activeLoans
        .filter((l) => l.daysOverdue > 90)
        .reduce((sum, l) => sum + l.outstandingPrincipal, 0),
    };

    const totalActiveAmount = activeLoans.reduce(
      (sum, l) => sum + l.outstandingPrincipal,
      0
    );
    const totalOverdueAmount = overdueLoans.reduce(
      (sum, l) => sum + l.outstandingPrincipal,
      0
    );

    return {
      totalActiveLoans: activeLoans.length,
      totalOverdueLoans: overdueLoans.length,
      totalActiveAmount,
      totalOverdueAmount,
      delinquencyRate:
        totalActiveAmount > 0 ? (totalOverdueAmount / totalActiveAmount) * 100 : 0,
      agingBuckets,
    };
  }
}

export const reportService = new ReportService();