// src/services/stateMachine.ts

import {
  ApplicationStatus,
  ContractStatus,
  LoanStatus,
  ClientStatus,
  InstallmentStatus,
  UserRole,
} from '@/models/types';

// =====================================================
// TRANSITIONS (UI LEVEL ONLY - backend authoritative)
// =====================================================

const clientTransitions: Record<ClientStatus, ClientStatus[]> = {
  pending: ['active', 'rejected', 'withdrawn'],
  active: ['closed', 'locked'],
  closed: [],
  rejected: [],
  withdrawn: [],
  locked: ['active'],
};

const applicationTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'cancelled'],
  under_review: ['approved', 'rejected', 'pending_documents', 'cancelled'],
  pending_documents: ['under_review', 'cancelled'],
  approved: [],
  rejected: [],
  cancelled: [],
};

const contractTransitions: Record<ContractStatus, ContractStatus[]> = {
  generated: ['pending_signature', 'cancelled'],
  pending_signature: ['signed', 'cancelled'],
  signed: [],
  cancelled: [],
};

const loanTransitions: Record<LoanStatus, LoanStatus[]> = {
  pending_approval: ['contract_signed', 'cancelled'],
  contract_signed: ['ready_for_disbursement', 'cancelled'],
  ready_for_disbursement: ['disbursed', 'cancelled'],
  disbursed: ['active'],
  active: ['in_arrears', 'closed', 'restructured', 'written_off'],
  in_arrears: ['active', 'closed', 'restructured', 'written_off'],
  restructured: ['active', 'in_arrears', 'closed', 'written_off'],
  written_off: [],
  closed: [],
  cancelled: [],
};

const installmentTransitions: Record<InstallmentStatus, InstallmentStatus[]> = {
  pending: ['partial', 'paid', 'overdue'],
  partial: ['paid', 'overdue'],
  overdue: ['partial', 'paid'],
  paid: [],
};

// =====================================================
// RESULT TYPE
// =====================================================

export interface TransitionResult {
  valid: boolean;
  error?: string;
}

// =====================================================
// STATE MACHINE
// =====================================================
const statusLabels = {
  client: {
    pending: 'Pendente',
    active: 'Activo',
    closed: 'Encerrado',
    rejected: 'Rejeitado',
    withdrawn: 'Desistiu',
    locked: 'Bloqueado',
  },
  application: {
    draft: 'Rascunho',
    submitted: 'Submetida',
    under_review: 'Em Análise',
    pending_documents: 'Aguardando Documentos',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
    cancelled: 'Cancelada',
  },
  contract: {
    generated: 'Gerado',
    pending_signature: 'Pendente Assinatura',
    signed: 'Assinado',
    cancelled: 'Cancelado',
  },
  loan: {
    pending_approval: 'Aguardando Aprovação',
    contract_signed: 'Contrato Assinado',
    ready_for_disbursement: 'Pronto para Desembolso',
    disbursed: 'Desembolsado',
    active: 'Activo',
    in_arrears: 'Em Atraso',
    restructured: 'Reestruturado',
    written_off: 'Abatido',
    closed: 'Liquidado',
    cancelled: 'Cancelado',
  },
  installment: {
    pending: 'Pendente',
    partial: 'Parcial',
    paid: 'Pago',
    overdue: 'Vencido',
  },
};

class StateMachine {
  // === GENERIC VALIDATOR ===

  private validateTransition<T extends string>(
    from: T,
    to: T,
    transitions: Record<T, T[]>,
    labels: Record<T, string>
  ): TransitionResult {
    const allowed = transitions[from];

    if (!allowed) {
      return { valid: false, error: `Estado "${labels[from]}" não reconhecido` };
    }

    if (!allowed.includes(to)) {
      return {
        valid: false,
        error: `Transição inválida: "${labels[from]}" → "${labels[to]}"`,
      };
    }

    return { valid: true };
  }

  // === CLIENT ===

  canTransitionClient(from: ClientStatus, to: ClientStatus): TransitionResult {
    return this.validateTransition(from, to, clientTransitions, statusLabels.client);
  }

  canClientOperate(status: ClientStatus): TransitionResult {
    const blocked: ClientStatus[] = ['closed', 'locked', 'rejected', 'withdrawn', 'pending'];

    if (blocked.includes(status)) {
      return {
        valid: false,
        error: `Cliente em estado "${statusLabels.client[status]}" não pode operar`,
      };
    }

    return { valid: true };
  }

  // === APPLICATION ===

  canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): TransitionResult {
    return this.validateTransition(from, to, applicationTransitions, statusLabels.application);
  }

  // === CONTRACT ===

  canTransitionContract(from: ContractStatus, to: ContractStatus): TransitionResult {
    return this.validateTransition(from, to, contractTransitions, statusLabels.contract);
  }

  // === LOAN ===

  canTransitionLoan(from: LoanStatus, to: LoanStatus): TransitionResult {
    return this.validateTransition(from, to, loanTransitions, statusLabels.loan);
  }

  // === INSTALLMENT ===

  canTransitionInstallment(from: InstallmentStatus, to: InstallmentStatus): TransitionResult {
    return this.validateTransition(from, to, installmentTransitions, statusLabels.installment);
  }

  // =====================================================
  // BUSINESS RULES (UI CHECK ONLY)
  // =====================================================

  canCreateContract(applicationStatus: ApplicationStatus): TransitionResult {
    return applicationStatus === 'approved'
      ? { valid: true }
      : { valid: false, error: 'Apenas aplicações aprovadas podem gerar contrato' };
  }

  canDisburse(contractStatus: ContractStatus): TransitionResult {
    return contractStatus === 'signed'
      ? { valid: true }
      : { valid: false, error: 'Contrato deve estar assinado' };
  }

  canRegisterPayment(loanStatus: LoanStatus): TransitionResult {
    const allowed: LoanStatus[] = ['active', 'in_arrears', 'disbursed'];

    return allowed.includes(loanStatus)
      ? { valid: true }
      : { valid: false, error: 'Empréstimo não permite pagamentos' };
  }

  // =====================================================
  // RBAC (FRONTEND ONLY)
  // =====================================================

  private hasRole(userRoles: UserRole[], allowed: UserRole[]): boolean {
    return userRoles.some(r => allowed.includes(r));
  }

  canUserApproveApplication(roles: UserRole[]): TransitionResult {
    return this.hasRole(roles, ['admin', 'analyst'])
      ? { valid: true }
      : { valid: false, error: 'Sem permissão para aprovar' };
  }

  canUserDisburse(roles: UserRole[]): TransitionResult {
    return this.hasRole(roles, ['admin', 'cashier'])
      ? { valid: true }
      : { valid: false, error: 'Sem permissão para desembolsar' };
  }

  canUserRegisterPayment(roles: UserRole[]): TransitionResult {
    return this.hasRole(roles, ['admin', 'cashier'])
      ? { valid: true }
      : { valid: false, error: 'Sem permissão para pagamento' };
  }

  canUserReversePayment(roles: UserRole[]): TransitionResult {
    return this.hasRole(roles, ['admin'])
      ? { valid: true }
      : { valid: false, error: 'Sem permissão para estorno' };
  }
}

export const stateMachine = new StateMachine();