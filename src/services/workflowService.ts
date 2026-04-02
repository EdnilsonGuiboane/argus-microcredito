// Workflow Service - End-to-end credit cycle operations
import { storageService } from './storageService';
import { calcService } from './calcService';
import { auditService } from './auditService';
import { stateMachine, statusLabels } from './stateMachine';
import { agingService } from './agingService';
import {
  LoanApplication,
  Contract,
  Loan,
  Payment,
  Disbursement,
  Client,
  LoanProduct,
  User,
  PaymentScheduleItem,
  PaymentMethod,
} from '@/models/types';

export interface WorkflowResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

class WorkflowService {
  /**
   * Submit a draft application
   */
  submitApplication(applicationId: string, userId: string, userName: string): WorkflowResult {
    const app = storageService.getById<LoanApplication>('applications', applicationId);
    if (!app) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    const transition = stateMachine.canTransitionApplication(app.status, 'submitted');
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    storageService.update('applications', applicationId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    auditService.log(userId, userName, 'SUBMETER_SOLICITACAO', 'application', applicationId);
    return { success: true };
  }

  /**
   * Start analysis of an application
   */
  startAnalysis(applicationId: string, analystId: string, analystName: string): WorkflowResult {
    const app = storageService.getById<LoanApplication>('applications', applicationId);
    if (!app) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    const transition = stateMachine.canTransitionApplication(app.status, 'under_review');
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    storageService.update('applications', applicationId, {
      status: 'under_review',
      assignedAnalyst: analystId,
      updatedAt: new Date().toISOString(),
    });

    auditService.log(analystId, analystName, 'INICIAR_ANALISE', 'application', applicationId);
    return { success: true };
  }

  /**
   * Approve an application and optionally generate contract
   */
  approveApplication(
    applicationId: string,
    analystId: string,
    analystName: string,
    approvedAmount: number,
    conditions?: string,
    generateContract: boolean = true
  ): WorkflowResult<{ contractId?: string }> {
    const app = storageService.getById<LoanApplication>('applications', applicationId);
    if (!app) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    const transition = stateMachine.canTransitionApplication(app.status, 'approved');
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const now = new Date().toISOString();
    storageService.update('applications', applicationId, {
      status: 'approved',
      approvedAmount,
      approvalConditions: conditions,
      reviewedAt: now,
      reviewedBy: analystId,
      updatedAt: now,
    });

    auditService.log(
      analystId,
      analystName,
      'APROVAR_SOLICITACAO',
      'application',
      applicationId,
      `Valor aprovado: ${calcService.formatCurrency(approvedAmount)}`
    );

    let contractId: string | undefined;
    if (generateContract) {
      const result = this.generateContract(applicationId, analystId, analystName);
      if (result.success && result.data) {
        contractId = result.data.contractId;
      }
    }

    return { success: true, data: { contractId } };
  }

  /**
   * Reject an application
   */
  rejectApplication(
    applicationId: string,
    analystId: string,
    analystName: string,
    reason: string
  ): WorkflowResult {
    const app = storageService.getById<LoanApplication>('applications', applicationId);
    if (!app) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    const transition = stateMachine.canTransitionApplication(app.status, 'rejected');
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const now = new Date().toISOString();
    storageService.update('applications', applicationId, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: analystId,
      updatedAt: now,
    });

    auditService.log(analystId, analystName, 'REJEITAR_SOLICITACAO', 'application', applicationId, reason);
    return { success: true };
  }

  /**
   * Generate contract from approved application
   */
  generateContract(
    applicationId: string,
    userId: string,
    userName: string
  ): WorkflowResult<{ contractId: string }> {
    const app = storageService.getById<LoanApplication>('applications', applicationId);
    if (!app) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    const canCreate = stateMachine.canCreateContract(app.status);
    if (!canCreate.valid) {
      return { success: false, error: canCreate.error };
    }

    // Check if contract already exists
    const existingContract = storageService.getAll<Contract>('contracts')
      .find(c => c.applicationId === applicationId);
    if (existingContract) {
      return { success: false, error: 'Já existe um contrato para esta solicitação' };
    }

    const product = storageService.getById<LoanProduct>('loanProducts', app.productId);
    if (!product) {
      return { success: false, error: 'Produto não encontrado' };
    }

    const amount = app.approvedAmount || app.requestedAmount;
    const monthlyRate = app.interestRate / 100;
    const schedule = calcService.calculateAmortizationSchedule(amount, monthlyRate, app.termMonths);
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
    const monthlyPayment = schedule[0]?.totalAmount || 0;
    const adminFee = amount * (product.adminFeeRate / 100);

    const contractNum = storageService.getAll<Contract>('contracts').length + 1;
    const now = new Date().toISOString();

    const contract: Contract = {
      id: `contract-${Date.now()}`,
      applicationId,
      clientId: app.clientId,
      contractNumber: `CTR-${new Date().getFullYear()}-${String(contractNum).padStart(5, '0')}`,
      principalAmount: amount,
      interestRate: app.interestRate,
      termMonths: app.termMonths,
      monthlyPayment,
      totalInterest,
      totalAmount: amount + totalInterest,
      adminFee,
      netDisbursement: amount - adminFee,
      status: 'pending_signature',
      createdAt: now,
    };

    storageService.create('contracts', contract);
    auditService.log(userId, userName, 'GERAR_CONTRATO', 'contract', contract.id, contract.contractNumber);

    return { success: true, data: { contractId: contract.id } };
  }

  /**
   * Sign a contract
   */
  signContract(contractId: string, userId: string, userName: string): WorkflowResult {
    const contract = storageService.getById<Contract>('contracts', contractId);
    if (!contract) {
      return { success: false, error: 'Contrato não encontrado' };
    }

    const transition = stateMachine.canTransitionContract(contract.status, 'signed');
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const now = new Date().toISOString();
    storageService.update('contracts', contractId, {
      status: 'signed',
      signedAt: now,
    });

    auditService.log(userId, userName, 'ASSINAR_CONTRATO', 'contract', contractId);
    return { success: true };
  }

  /**
   * Disburse a signed contract
   */
  disburse(
    contractId: string,
    cashierId: string,
    cashierName: string,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ): WorkflowResult<{ loanId: string; disbursementId: string }> {
    const contract = storageService.getById<Contract>('contracts', contractId);
    if (!contract) {
      return { success: false, error: 'Contrato não encontrado' };
    }

    const canDisburse = stateMachine.canDisburse(contract.status);
    if (!canDisburse.valid) {
      return { success: false, error: canDisburse.error };
    }

    // Check if already disbursed
    const existingLoan = storageService.getAll<Loan>('loans')
      .find(l => l.contractId === contractId);
    if (existingLoan) {
      return { success: false, error: 'Este contrato já foi desembolsado' };
    }

    const now = new Date();
    const nowStr = now.toISOString();
    const loanNum = storageService.getAll<Loan>('loans').length + 1;

    // Generate payment schedule
    const monthlyRate = contract.interestRate / 100;
    const schedule = calcService.calculateAmortizationSchedule(
      contract.principalAmount,
      monthlyRate,
      contract.termMonths
    );

    const loanSchedule: PaymentScheduleItem[] = schedule.map((item, idx) => {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + idx + 1);
      return {
        ...item,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending' as const,
        paidAmount: 0,
      };
    });

    const loan: Loan = {
      id: `loan-${Date.now()}`,
      contractId,
      clientId: contract.clientId,
      applicationId: contract.applicationId,
      loanNumber: `EMP-${new Date().getFullYear()}-${String(loanNum).padStart(5, '0')}`,
      principalAmount: contract.principalAmount,
      interestRate: contract.interestRate,
      termMonths: contract.termMonths,
      monthlyPayment: contract.monthlyPayment,
      disbursedAmount: contract.netDisbursement,
      disbursedAt: nowStr,
      disbursementMethod: method,
      disbursementReference: reference || `REF-${Date.now()}`,
      status: 'active',
      outstandingPrincipal: contract.principalAmount,
      outstandingInterest: 0,
      totalPaid: 0,
      daysOverdue: 0,
      nextPaymentDate: loanSchedule[0]?.dueDate,
      nextPaymentAmount: loanSchedule[0]?.totalAmount,
      analystId: 'analyst-1',
      cashierId,
      createdAt: nowStr,
      updatedAt: nowStr,
      schedule: loanSchedule,
    };

    storageService.create('loans', loan);

    const disbursement: Disbursement = {
      id: `disb-${Date.now()}`,
      loanId: loan.id,
      contractId,
      clientId: contract.clientId,
      grossAmount: contract.principalAmount,
      adminFee: contract.adminFee,
      netAmount: contract.netDisbursement,
      method,
      reference: reference || loan.disbursementReference,
      disbursedAt: nowStr,
      processedBy: cashierId,
      notes,
    };

    storageService.create('disbursements', disbursement);

    auditService.log(
      cashierId,
      cashierName,
      'DESEMBOLSAR',
      'loan',
      loan.id,
      `${calcService.formatCurrency(contract.netDisbursement)} via ${method}`
    );

    return { success: true, data: { loanId: loan.id, disbursementId: disbursement.id } };
  }

  /**
   * Register a payment with automatic allocation
   */
  registerPayment(
    loanId: string,
    amount: number,
    cashierId: string,
    cashierName: string,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ): WorkflowResult<{ paymentId: string; receiptNumber: string }> {
    const loan = storageService.getById<Loan>('loans', loanId);
    if (!loan) {
      return { success: false, error: 'Empréstimo não encontrado' };
    }

    const canPay = stateMachine.canRegisterPayment(loan.status);
    if (!canPay.valid) {
      return { success: false, error: canPay.error };
    }

    if (amount <= 0) {
      return { success: false, error: 'O valor do pagamento deve ser maior que zero' };
    }

    const now = new Date().toISOString();
    const paymentNum = storageService.getAll<Payment>('payments').length + 1;
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(paymentNum).padStart(6, '0')}`;

    // Allocate: Penalty → Interest → Principal
    let remaining = amount;
    let penaltyPaid = 0;
    let interestPaid = 0;
    let principalPaid = 0;

    // Calculate penalty if overdue
    if (loan.daysOverdue > 0) {
      const overdueInstallments = loan.schedule.filter(s => s.status === 'overdue');
      const overdueAmount = overdueInstallments.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);
      const penalty = calcService.calculateLatePenalty(overdueAmount, 0.005, loan.daysOverdue);
      penaltyPaid = Math.min(remaining, penalty);
      remaining -= penaltyPaid;
    }

    // Allocate to installments in order
    let amountToAllocate = remaining;
    const updatedSchedule = loan.schedule.map(item => {
      if (item.status === 'paid' || amountToAllocate <= 0) return item;

      const due = item.totalAmount - item.paidAmount;
      if (due > 0) {
        const allocation = Math.min(amountToAllocate, due);
        amountToAllocate -= allocation;

        // Split allocation between interest and principal
        const interestDue = Math.max(0, item.interest - (item.paidAmount > item.principal ? item.paidAmount - item.principal : 0));
        const interestAlloc = Math.min(allocation, interestDue);
        const principalAlloc = allocation - interestAlloc;

        interestPaid += interestAlloc;
        principalPaid += principalAlloc;

        const newPaidAmount = item.paidAmount + allocation;
        return {
          ...item,
          paidAmount: newPaidAmount,
          status: newPaidAmount >= item.totalAmount ? 'paid' as const : item.status,
          paidAt: newPaidAmount >= item.totalAmount ? now : item.paidAt,
        };
      }
      return item;
    });

    // Update loan
    const newOutstandingPrincipal = Math.max(0, loan.outstandingPrincipal - principalPaid);
    const newTotalPaid = loan.totalPaid + amount;
    
    let newStatus = loan.status;
    if (newOutstandingPrincipal <= 0) {
      newStatus = 'paid_off';
    } else {
      const hasOverdue = updatedSchedule.some(s => s.status === 'overdue');
      newStatus = hasOverdue ? 'overdue' : 'active';
    }

    const nextPending = updatedSchedule.find(s => s.status === 'pending' || s.status === 'overdue');

    storageService.update('loans', loanId, {
      outstandingPrincipal: newOutstandingPrincipal,
      totalPaid: newTotalPaid,
      status: newStatus,
      lastPaymentDate: now,
      paidOffAt: newStatus === 'paid_off' ? now : undefined,
      schedule: updatedSchedule,
      nextPaymentDate: nextPending?.dueDate,
      nextPaymentAmount: nextPending?.totalAmount,
      daysOverdue: newStatus === 'paid_off' ? 0 : loan.daysOverdue,
      updatedAt: now,
    });

    const payment: Payment = {
      id: `pmt-${Date.now()}`,
      loanId,
      clientId: loan.clientId,
      amount,
      principalPaid,
      interestPaid,
      penaltyPaid,
      paymentMethod: method,
      reference,
      receiptNumber,
      paymentDate: now,
      processedAt: now,
      processedBy: cashierId,
      notes,
      reversed: false,
    };

    storageService.create('payments', payment);

    auditService.log(
      cashierId,
      cashierName,
      'REGISTAR_PAGAMENTO',
      'payment',
      payment.id,
      `${calcService.formatCurrency(amount)} - Recibo ${receiptNumber}`
    );

    return { success: true, data: { paymentId: payment.id, receiptNumber } };
  }

  /**
   * Reverse a payment (Admin only)
   */
  reversePayment(
    paymentId: string,
    adminId: string,
    adminName: string,
    reason: string
  ): WorkflowResult {
    const payment = storageService.getById<Payment>('payments', paymentId);
    if (!payment) {
      return { success: false, error: 'Pagamento não encontrado' };
    }

    if (payment.reversed) {
      return { success: false, error: 'Este pagamento já foi estornado' };
    }

    const loan = storageService.getById<Loan>('loans', payment.loanId);
    if (!loan) {
      return { success: false, error: 'Empréstimo não encontrado' };
    }

    const canReverse = stateMachine.canReversePayment(loan.status);
    if (!canReverse.valid) {
      return { success: false, error: canReverse.error };
    }

    const now = new Date().toISOString();

    // Reverse payment
    storageService.update('payments', paymentId, {
      reversed: true,
      reversedAt: now,
      reversedBy: adminId,
      reversalReason: reason,
    });

    // Restore loan balances
    storageService.update('loans', loan.id, {
      outstandingPrincipal: loan.outstandingPrincipal + payment.principalPaid,
      totalPaid: loan.totalPaid - payment.amount,
      status: 'active',
      paidOffAt: undefined,
      updatedAt: now,
    });

    auditService.log(
      adminId,
      adminName,
      'ESTORNAR_PAGAMENTO',
      'payment',
      paymentId,
      `Estorno de ${calcService.formatCurrency(payment.amount)} - Motivo: ${reason}`
    );

    // Recalculate aging
    agingService.forceRecalculate();

    return { success: true };
  }

  /**
   * Run demo scenario - creates complete credit cycle
   */
  runDemoScenario(userId: string, userName: string): WorkflowResult<{
    clientId: string;
    applicationId: string;
    contractId: string;
    loanId: string;
    paymentId: string;
  }> {
    const now = new Date();
    const products = storageService.getAll<LoanProduct>('loanProducts');
    if (products.length === 0) {
      return { success: false, error: 'Nenhum produto de empréstimo configurado' };
    }

    // 1. Create demo client
    const clientId = `demo-client-${Date.now()}`;
    const client: Client = {
      id: clientId,
      fullName: 'Demo - Maria Demo Silva',
      dateOfBirth: '1985-06-15',
      gender: 'F',
      phone: '+258 84 000 0000',
      email: 'demo@teste.co.mz',
      address: 'Av. Demo, 123',
      district: 'KaMpfumo',
      province: 'Maputo Cidade',
      biNumber: '000000000D',
      nuit: '000000000',
      employer: 'Demo Empresa',
      occupation: 'Comerciante',
      monthlyIncome: 50000,
      monthlyExpenses: 20000,
      reference1: { name: 'João Demo', phone: '+258 84 111 1111', relationship: 'Cônjuge' },
      reference2: { name: 'Ana Demo', phone: '+258 84 222 2222', relationship: 'Irmã' },
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: userId,
    };
    storageService.create('clients', client);
    auditService.log(userId, userName, 'DEMO_CRIAR_CLIENTE', 'client', clientId);

    // 2. Create application
    const product = products[0];
    const applicationId = `demo-app-${Date.now()}`;
    const application: LoanApplication = {
      id: applicationId,
      clientId,
      productId: product.id,
      requestedAmount: 25000,
      termMonths: 6,
      interestRate: product.defaultInterestRate,
      adminFee: 25000 * (product.adminFeeRate / 100),
      purpose: 'Capital de giro',
      guaranteeType: 'Fiador',
      guarantorName: 'Pedro Demo',
      guarantorPhone: '+258 84 333 3333',
      dti: 40,
      paymentCapacity: 30000,
      riskLevel: 'low',
      creditScore: 720,
      status: 'submitted',
      submittedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: userId,
      comments: [],
      documents: [
        { id: 'doc-demo-1', name: 'BI', type: 'identification', required: true, uploaded: true, uploadedAt: now.toISOString(), fileName: 'bi_demo.pdf', fileSize: 200000, verified: true },
        { id: 'doc-demo-2', name: 'Comprovativo', type: 'income', required: true, uploaded: true, uploadedAt: now.toISOString(), fileName: 'rendimento_demo.pdf', fileSize: 150000, verified: true },
      ],
    };
    storageService.create('applications', application);
    auditService.log(userId, userName, 'DEMO_CRIAR_SOLICITACAO', 'application', applicationId);

    // 3. Start analysis first (submitted → under_review)
    const analysisResult = this.startAnalysis(applicationId, userId, userName);
    if (!analysisResult.success) {
      return { success: false, error: 'Falha ao iniciar análise: ' + analysisResult.error };
    }

    // 4. Approve application (under_review → approved, generates contract)
    const approveResult = this.approveApplication(
      applicationId,
      userId,
      userName,
      25000,
      'Aprovado via cenário demo',
      true
    );
    if (!approveResult.success || !approveResult.data?.contractId) {
      return { success: false, error: 'Falha ao aprovar solicitação' };
    }
    const contractId = approveResult.data.contractId;

    // 5. Sign contract
    const signResult = this.signContract(contractId, userId, userName);
    if (!signResult.success) {
      return { success: false, error: 'Falha ao assinar contrato' };
    }

    // 6. Disburse
    const disburseResult = this.disburse(
      contractId,
      userId,
      userName,
      'mpesa',
      'DEMO-REF-001',
      'Desembolso demo'
    );
    if (!disburseResult.success || !disburseResult.data?.loanId) {
      return { success: false, error: 'Falha ao desembolsar' };
    }
    const loanId = disburseResult.data.loanId;

    // 7. Register payment
    const loan = storageService.getById<Loan>('loans', loanId);
    const paymentResult = this.registerPayment(
      loanId,
      loan?.monthlyPayment || 5000,
      userId,
      userName,
      'mpesa',
      'DEMO-PAY-001',
      'Pagamento demo'
    );
    if (!paymentResult.success || !paymentResult.data?.paymentId) {
      return { success: false, error: 'Falha ao registar pagamento' };
    }

    return {
      success: true,
      data: {
        clientId,
        applicationId,
        contractId,
        loanId,
        paymentId: paymentResult.data.paymentId,
      },
    };
  }
}

export const workflowService = new WorkflowService();
