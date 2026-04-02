// Microcredit System Types - Mozambique Context
// Backend-aligned version for Supabase + PostgreSQL + Multi-tenant

// =====================================================
// SHARED / BASE
// =====================================================

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;

export interface BaseEntity {
  id: UUID;
  tenantId: UUID;
  createdAt: ISODateTimeString;
}

export interface AuditableEntity extends BaseEntity {
  updatedAt: ISODateTimeString;
}

// =====================================================
// AUTH / USERS / ROLES
// =====================================================

// =====================================================
// AUTH / USERS / ROLES
// =====================================================

export type UserRole = 'admin' | 'analyst' | 'cashier';

export interface User extends AuditableEntity {
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: ISODateTimeString;
}

export interface UserRoleAssignment {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  role: UserRole;
  grantedBy?: UUID;
  grantedAt: ISODateTimeString;
}

export interface AuthSession {
  user: User;
  roles: UserRole[];
  token: string;
  expiresAt: ISODateTimeString;
}

// =====================================================
// TENANT
// =====================================================

export type TenantStatus = 'active' | 'suspended' | 'trial';
export type SubscriptionPlan = 'basic' | 'professional' | 'enterprise';

export interface TenantSettings {
  currency: string;
  language: string;
  fiscalYearStart: string;
  maxLoanAmount: number;
  defaultInterestRate: number;
  latePenaltyRate: number;
  gracePeriodDays: number;
  workingDays: string[];
  smsNotifications: boolean;
  requireGuarantor: boolean;
  minCreditScore: number;
}

export interface Tenant extends AuditableEntity {
  name: string;
  slug: string;
  legalName?: string;
  nuit?: string;
  licenseNumber?: string;
  address?: string;
  province?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  status: TenantStatus;
  settings: TenantSettings;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: ISODateTimeString;
  maxUsers: number;
  maxClients: number;
}

// =====================================================
// CLIENTS
// =====================================================

export type Gender = 'M' | 'F' | 'Outro';

export type ClientStatus =
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected'
  | 'withdrawn'
  | 'locked';

export interface ClientReference {
  name: string;
  phone: string;
  relationship: string;
}

export interface Client extends AuditableEntity {
  fullName: string;
  dateOfBirth: ISODateString;
  gender: Gender;
  phone: string;
  email?: string;
  address: string;
  district: string;
  province: string;

  biNumber: string;
  nuit?: string;

  employer?: string;
  occupation: string;
  monthlyIncome: number;
  monthlyExpenses: number;

  reference1: ClientReference;
  reference2: ClientReference;

  notes?: string;
  status: ClientStatus;

  closedAt?: ISODateTimeString;
  closedReason?: string;
  closedBy?: UUID;

  lockedAt?: ISODateTimeString;
  lockReason?: string;
  lockedBy?: UUID;

  rejectedAt?: ISODateTimeString;
  rejectionReason?: string;
  rejectedBy?: UUID;

  withdrawnAt?: ISODateTimeString;
  withdrawalReason?: string;

  createdBy: UUID;
}

// =====================================================
// LOAN PRODUCTS
// =====================================================

export interface LoanProduct extends AuditableEntity {
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  defaultInterestRate: number; // annual %
  adminFeeRate: number; // % of principal
  latePenaltyRate: number; // % or business rule basis
  gracePeriodDays: number;
  isActive: boolean;
}

// =====================================================
// APPLICATIONS
// =====================================================

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface LoanApplication extends AuditableEntity {
  clientId: UUID;
  productId: UUID;

  requestedAmount: number;
  approvedAmount?: number;
  termMonths: number;
  interestRate: number;
  adminFee: number;

  purpose: string;
  guaranteeType: string;
  guaranteeDescription?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorBi?: string;

  dti?: number;
  paymentCapacity?: number;
  riskLevel?: RiskLevel;
  creditScore?: number;

  status: ApplicationStatus;
  submittedAt?: ISODateTimeString;
  reviewedAt?: ISODateTimeString;
  reviewedBy?: UUID;
  rejectionReason?: string;
  approvalConditions?: string;

  createdBy: UUID;
  assignedAnalyst?: UUID;
}

export interface ApplicationComment {
  id: UUID;
  tenantId: UUID;
  applicationId: UUID;
  userId: UUID;
  content: string;
  createdAt: ISODateTimeString;
}

export type DocumentType =
  | 'bi_copy'
  | 'nuit'
  | 'proof_of_income'
  | 'proof_of_address'
  | 'business_license'
  | 'bank_statement'
  | 'photo'
  | 'contract_signed'
  | 'guarantee_doc'
  | 'other';

export type DocumentEntityType = 'application' | 'client' | 'loan' | 'contract';

export interface Document {
  id: UUID;
  tenantId: UUID;

  entityType: DocumentEntityType;
  entityId: UUID;

  documentType: DocumentType;
  name: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;

  required: boolean;
  uploaded: boolean;
  uploadedAt?: ISODateTimeString;
  uploadedBy?: UUID;

  verified: boolean;
  verifiedBy?: UUID;
  verifiedAt?: ISODateTimeString;
  rejectedReason?: string;

  createdAt: ISODateTimeString;
}

// =====================================================
// CONTRACTS
// =====================================================

export type ContractStatus =
  | 'generated'
  | 'pending_signature'
  | 'signed'
  | 'cancelled';

export interface Contract extends BaseEntity {
  applicationId: UUID;
  clientId: UUID;

  contractNumber: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  adminFee: number;
  netDisbursement: number;

  status: ContractStatus;
  generatedAt?: ISODateTimeString;
  generatedBy?: UUID;
  signedAt?: ISODateTimeString;
  signedBy?: UUID;
  cancelledAt?: ISODateTimeString;
  cancelledBy?: UUID;
  cancellationReason?: string;
}

// =====================================================
// LOANS
// =====================================================

export type LoanStatus =
  | 'pending_approval'
  | 'contract_signed'
  | 'ready_for_disbursement'
  | 'disbursed'
  | 'active'
  | 'in_arrears'
  | 'restructured'
  | 'written_off'
  | 'closed'
  | 'cancelled';

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface Loan extends AuditableEntity {
  contractId: UUID;
  clientId: UUID;
  applicationId: UUID;

  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;

  disbursedAmount: number;
  disbursedAt?: ISODateTimeString;
  disbursementMethod?: PaymentMethod;
  disbursementReference?: string;

  outstandingPrincipal: number;
  outstandingInterest: number;
  totalPaid: number;
  daysOverdue: number;

  nextPaymentDate?: ISODateString;
  nextPaymentAmount?: number;
  lastPaymentDate?: ISODateString;
  paidOffAt?: ISODateTimeString;

  status: LoanStatus;

  analystId: UUID;
  cashierId?: UUID;
}

export interface Installment extends AuditableEntity {
  loanId: UUID;
  installmentNumber: number;
  dueDate: ISODateString;
  principal: number;
  interest: number;
  totalAmount: number;
  balanceAfter: number;
  status: InstallmentStatus;
  paidAmount: number;
  paidAt?: ISODateTimeString;
  penalty: number;
}

// Mantido para UI/compatibilidade, mas idealmente usar Installment
export type PaymentScheduleItem = Installment;

// =====================================================
// PAYMENTS
// =====================================================

export type PaymentMethod =
  | 'cash'
  | 'mpesa'
  | 'emola'
  | 'bank_transfer'
  | 'cheque';

/**
 * Payment:
 * representa um pagamento/recibo/transação registada.
 * Mantido para compatibilidade com partes do sistema já existentes.
 */
export interface Payment extends BaseEntity {
  loanId: UUID;
  clientId: UUID;
  installmentId?: UUID;

  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;

  paymentMethod: PaymentMethod;
  reference?: string;
  receiptNumber: string;
  paymentDate: ISODateString;

  reversed: boolean;
  reversedAt?: ISODateTimeString;
  reversedBy?: UUID;
  reversalReason?: string;

  processedAt: ISODateTimeString;
  processedBy: UUID;
  notes?: string;
}

/**
 * InstallmentPayment:
 * representa a prestação/plano de pagamento persistido no banco.
 * É este tipo que deve ser usado no paymentMapper/paymentService
 * para a tabela public.payments.
 */
export type InstallmentPaymentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'waived';

export interface InstallmentPayment extends AuditableEntity {
  loanId: UUID;
  clientId: UUID;

  installmentNumber: number;
  dueDate: ISODateString;

  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  totalDue: number;

  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  totalPaid: number;

  paymentDate?: ISODateTimeString;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;

  daysOverdue: number;
  status: InstallmentPaymentStatus;

  processedBy?: UUID;
  notes?: string;
}

// =====================================================
// DISBURSEMENTS
// =====================================================

export interface Disbursement extends BaseEntity {
  loanId: UUID;
  contractId: UUID;
  clientId: UUID;

  grossAmount: number;
  adminFee: number;
  netAmount: number;

  method: PaymentMethod;
  reference?: string;

  disbursedAt: ISODateTimeString;
  processedBy: UUID;
  notes?: string;
}

// =====================================================
// COLLECTIONS
// =====================================================

export type CollectionTaskType = 'call' | 'sms' | 'visit' | 'promise';
export type CollectionTaskStatus = 'pending' | 'completed' | 'failed';

export interface CollectionTask extends BaseEntity {
  loanId: UUID;
  clientId: UUID;
  type: CollectionTaskType;
  status: CollectionTaskStatus;
  scheduledFor: ISODateTimeString;
  completedAt?: ISODateTimeString;
  completedBy?: UUID;
  notes?: string;
  promiseDate?: ISODateString;
  promiseAmount?: number;
}

export type CollectionInteractionType = 'call' | 'sms' | 'visit' | 'email' | 'promise';
export type CollectionInteractionOutcome =
  | 'contacted'
  | 'no_answer'
  | 'promise'
  | 'refused'
  | 'wrong_number';

export interface CollectionInteraction extends BaseEntity {
  loanId: UUID;
  clientId: UUID;
  type: CollectionInteractionType;
  outcome: CollectionInteractionOutcome;
  notes: string;
  nextAction?: string;
  nextActionDate?: ISODateString;
  createdBy: UUID;
}

// =====================================================
// AUDIT
// =====================================================

export interface AuditLog {
  id: UUID;
  tenantId: UUID;
  userId?: UUID;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: ISODateTimeString;
}

// =====================================================
// DASHBOARD / REPORTING
// =====================================================

export interface DashboardStats {
  activePortfolio: number;
  totalClients: number;
  applicationsInReview: number;
  approvedToday: number;
  disbursedThisMonth: number;
  paymentsThisMonth: number;
  delinquencyRate: number;
  overdueAmount: number;
  agingBuckets: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
}

// =====================================================
// UI / VIEW MODELS
// =====================================================

export interface LoanApplicationDetails extends LoanApplication {
  client?: Client;
  product?: LoanProduct;
  comments?: ApplicationComment[];
  documents?: Document[];
}

export interface LoanDetails extends Loan {
  client?: Client;
  contract?: Contract;
  installments?: Installment[];
  payments?: Payment[];
  installmentPayments?: InstallmentPayment[];
}

// =====================================================
// MOZAMBIQUE-SPECIFIC CONSTANTS
// =====================================================

export const MOZAMBIQUE_PROVINCES = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
] as const;

export const MOZAMBIQUE_DISTRICTS: Record<string, string[]> = {
  'Maputo Cidade': ['KaMpfumo', 'Nlhamankulu', 'KaMaxakeni', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka'],
  'Maputo Província': ['Matola', 'Boane', 'Namaacha', 'Matutuíne', 'Moamba', 'Marracuene', 'Manhiça', 'Magude'],
  Gaza: ['Xai-Xai', 'Chókwè', 'Chibuto', 'Mandlakazi', 'Bilene', 'Limpopo', 'Guijá', 'Mabalane', 'Massingir', 'Chicualacuala', 'Massangena', 'Chigubo'],
  Inhambane: ['Inhambane', 'Maxixe', 'Vilankulo', 'Massinga', 'Morrumbene', 'Jangamo', 'Inharrime', 'Zavala', 'Govuro', 'Homoíne', 'Panda', 'Funhalouro', 'Mabote'],
  Sofala: ['Beira', 'Dondo', 'Nhamatanda', 'Gorongosa', 'Búzi', 'Chibabava', 'Machanga', 'Cheringoma', 'Marromeu', 'Muanza', 'Caia', 'Chemba', 'Maringué'],
  Manica: ['Chimoio', 'Gondola', 'Manica', 'Sussundenga', 'Mossurize', 'Báruè', 'Macossa', 'Guro', 'Tambara', 'Machaze', 'Vanduzi'],
  Tete: ['Tete', 'Moatize', 'Angónia', 'Tsangano', 'Macanga', 'Zumbo', 'Maravia', 'Chiuta', 'Mágoè', 'Cahora Bassa', 'Changara', 'Mutarara', 'Dôa', 'Chifunde'],
  'Zambézia': ['Quelimane', 'Mocuba', 'Milange', 'Gurué', 'Alto Molócuè', 'Maganja da Costa', 'Namacurra', 'Nicoadala', 'Inhassunge', 'Chinde', 'Morrumbala', 'Mopeia', 'Lugela', 'Ile', 'Namarroi', 'Gilé', 'Pebane', 'Mulevala'],
  Nampula: ['Nampula', 'Nacala', 'Angoche', 'Monapo', 'Meconta', 'Mogovolas', 'Moma', 'Murrupula', 'Malema', 'Ribáuè', 'Lalaua', 'Mecubúri', 'Muecate', 'Mogincual', 'Liúpo', 'Eráti', 'Memba', 'Nacala-a-Velha', 'Mossuril', 'Ilha de Moçambique', 'Larde', 'Nacarôa'],
  'Cabo Delgado': ['Pemba', 'Montepuez', 'Chiúre', 'Ancuabe', 'Metuge', 'Balama', 'Namuno', 'Mueda', 'Muidumbe', 'Nangade', 'Palma', 'Mocímboa da Praia', 'Macomia', 'Quissanga', 'Ibo', 'Meluco', 'Mecúfi'],
  Niassa: ['Lichinga', 'Cuamba', 'Mandimba', 'Marrupa', 'Majune', 'Ngauma', 'Lago', 'Sanga', 'Metarica', 'Muembe', 'Mavago', 'Mecula', 'Maúa', 'Nipepe', 'Mecanhelas', 'Chimbonila'],
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'emola', label: 'e-Mola' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'cheque', label: 'Cheque' },
];

export const GUARANTEE_TYPES = [
  'Sem garantia',
  'Fiador',
  'Penhor de bens',
  'Caução em dinheiro',
  'Veículo',
  'Equipamento',
  'Outro',
] as const;

export const LOAN_PURPOSES = [
  'Capital de giro',
  'Compra de mercadoria',
  'Equipamento',
  'Expansão de negócio',
  'Emergência pessoal',
  'Educação',
  'Saúde',
  'Habitação',
  'Agricultura',
  'Outro',
] as const;