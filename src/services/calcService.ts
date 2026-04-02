// src/services/calcService.ts

import { PaymentScheduleItem, RiskLevel } from '@/models/types';

type AmortizationRow = Omit<
  PaymentScheduleItem,
  'id' | 'tenantId' | 'loanId' | 'dueDate' | 'status' | 'paidAmount' | 'paidAt' | 'penalty' | 'createdAt' | 'updatedAt'
>;

interface LoanSimulationInput {
  principal: number;
  annualInterestRate: number; // ex: 36 = 36% ao ano
  termMonths: number;
  adminFeeRate?: number; // % sobre o principal
}

interface LoanSimulationResult {
  principal: number;
  annualInterestRate: number;
  monthlyRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  adminFee: number;
  netDisbursement: number;
  schedule: AmortizationRow[];
}

class CalcService {
  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Converte taxa anual (%) para taxa mensal decimal
   * Ex: 36 => 0.03
   */
  annualRateToMonthlyRate(annualRatePercent: number): number {
    return annualRatePercent / 100 / 12;
  }

  /**
   * Calcula prestação mensal pelo sistema Price
   * @param principal valor do empréstimo
   * @param monthlyRate taxa mensal decimal (ex: 0.03)
   * @param termMonths prazo em meses
   */
  calculateMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
    if (principal <= 0 || termMonths <= 0) return 0;

    if (monthlyRate === 0) {
      return this.round(principal / termMonths);
    }

    const factor = Math.pow(1 + monthlyRate, termMonths);
    const payment = (principal * monthlyRate * factor) / (factor - 1);

    return this.round(payment);
  }

  /**
   * Gera plano de amortização completo
   * Nota:
   * - usado no frontend para preview
   * - no backend deve existir cálculo oficial
   */
  calculateAmortizationSchedule(
    principal: number,
    monthlyRate: number,
    termMonths: number
  ): AmortizationRow[] {
    if (principal <= 0 || termMonths <= 0) return [];

    const schedule: AmortizationRow[] = [];
    const monthlyPayment = this.calculateMonthlyPayment(principal, monthlyRate, termMonths);

    let balance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = this.round(balance * monthlyRate);
      let principalPayment = this.round(monthlyPayment - interestPayment);

      // Ajuste da última parcela para fechar saldo residual por arredondamento
      if (i === termMonths) {
        principalPayment = this.round(balance);
      }

      const totalAmount = this.round(principalPayment + interestPayment);
      balance = this.round(balance - principalPayment);

      schedule.push({
        installmentNumber: i,
        principal: principalPayment,
        interest: interestPayment,
        totalAmount,
        balanceAfter: Math.max(0, this.round(balance)),
      });
    }

    return schedule;
  }

  /**
   * Calcula juros totais do cronograma
   */
  calculateTotalInterest(schedule: AmortizationRow[]): number {
    return this.round(schedule.reduce((sum, item) => sum + item.interest, 0));
  }

  /**
   * Calcula taxa administrativa
   */
  calculateAdminFee(principal: number, adminFeeRate: number = 0): number {
    if (principal <= 0 || adminFeeRate <= 0) return 0;
    return this.round(principal * (adminFeeRate / 100));
  }

  /**
   * Simulação completa de empréstimo
   */
  simulateLoan(input: LoanSimulationInput): LoanSimulationResult {
    const monthlyRate = this.annualRateToMonthlyRate(input.annualInterestRate);
    const schedule = this.calculateAmortizationSchedule(
      input.principal,
      monthlyRate,
      input.termMonths
    );

    const monthlyPayment = schedule[0]?.totalAmount ?? 0;
    const totalInterest = this.calculateTotalInterest(schedule);
    const adminFee = this.calculateAdminFee(input.principal, input.adminFeeRate ?? 0);
    const totalAmount = this.round(input.principal + totalInterest);
    const netDisbursement = this.round(input.principal - adminFee);

    return {
      principal: this.round(input.principal),
      annualInterestRate: input.annualInterestRate,
      monthlyRate,
      termMonths: input.termMonths,
      monthlyPayment,
      totalInterest,
      totalAmount,
      adminFee,
      netDisbursement,
      schedule,
    };
  }

  /**
   * Multa por atraso
   * @param overdueAmount valor vencido
   * @param dailyPenaltyRate taxa diária decimal (ex: 0.005 = 0.5%)
   * @param daysOverdue dias de atraso
   */
  calculateLatePenalty(
    overdueAmount: number,
    dailyPenaltyRate: number,
    daysOverdue: number
  ): number {
    if (overdueAmount <= 0 || dailyPenaltyRate <= 0 || daysOverdue <= 0) return 0;
    return this.round(overdueAmount * dailyPenaltyRate * daysOverdue);
  }

  /**
   * Debt-to-Income ratio em %
   * Ex: prestação 5.000 / rendimento 20.000 = 25%
   */
  calculateDTI(totalDebtPayments: number, monthlyIncome: number): number {
    if (monthlyIncome <= 0) return 100;
    return this.round((totalDebtPayments / monthlyIncome) * 100);
  }

  /**
   * Capacidade de pagamento bruta
   */
  calculatePaymentCapacity(monthlyIncome: number, monthlyExpenses: number): number {
    return Math.max(0, this.round(monthlyIncome - monthlyExpenses));
  }

  /**
   * Capacidade disponível após considerar nova prestação
   */
  calculateRemainingCapacity(
    monthlyIncome: number,
    monthlyExpenses: number,
    newMonthlyPayment: number
  ): number {
    return Math.max(0, this.round(monthlyIncome - monthlyExpenses - newMonthlyPayment));
  }

  /**
   * Verifica se cliente suporta a nova prestação
   */
  canAffordLoan(
    monthlyIncome: number,
    monthlyExpenses: number,
    newMonthlyPayment: number
  ): boolean {
    return this.calculatePaymentCapacity(monthlyIncome, monthlyExpenses) >= newMonthlyPayment;
  }

  /**
   * Credit score simples para pré-análise
   * Nota: deve ser tratado como score operacional interno,
   * não score de bureau de crédito
   */
  calculateCreditScore(
    dti: number,
    paymentCapacity: number,
    monthlyPayment: number,
    hasGuarantor: boolean,
    hasCollateral: boolean
  ): number {
    let score = 500;

    // Impacto do DTI
    if (dti < 20) score += 100;
    else if (dti < 30) score += 70;
    else if (dti < 40) score += 40;
    else if (dti < 50) score += 10;
    else score -= 50;

    // Relação capacidade / prestação
    const safeMonthlyPayment = monthlyPayment > 0 ? monthlyPayment : 1;
    const capacityRatio = paymentCapacity / safeMonthlyPayment;

    if (capacityRatio > 3) score += 100;
    else if (capacityRatio > 2) score += 70;
    else if (capacityRatio > 1.5) score += 40;
    else if (capacityRatio > 1) score += 10;
    else score -= 100;

    if (hasGuarantor) score += 50;
    if (hasCollateral) score += 50;

    return Math.max(300, Math.min(850, Math.round(score)));
  }

  /**
   * Nível de risco com base no score
   */
  getRiskLevel(creditScore: number): RiskLevel {
    if (creditScore >= 700) return 'low';
    if (creditScore >= 550) return 'medium';
    return 'high';
  }

  /**
   * Avaliação resumida da proposta
   */
  evaluateAffordability(params: {
    monthlyIncome: number;
    monthlyExpenses: number;
    totalExistingDebtPayments?: number;
    newMonthlyPayment: number;
    hasGuarantor?: boolean;
    hasCollateral?: boolean;
  }) {
    const totalDebtPayments =
      (params.totalExistingDebtPayments ?? 0) + params.newMonthlyPayment;

    const paymentCapacity = this.calculatePaymentCapacity(
      params.monthlyIncome,
      params.monthlyExpenses
    );

    const dti = this.calculateDTI(totalDebtPayments, params.monthlyIncome);

    const creditScore = this.calculateCreditScore(
      dti,
      paymentCapacity,
      params.newMonthlyPayment,
      Boolean(params.hasGuarantor),
      Boolean(params.hasCollateral)
    );

    const riskLevel = this.getRiskLevel(creditScore);
    const affordable = paymentCapacity >= params.newMonthlyPayment;

    return {
      paymentCapacity,
      dti,
      creditScore,
      riskLevel,
      affordable,
      remainingCapacity: this.calculateRemainingCapacity(
        params.monthlyIncome,
        params.monthlyExpenses,
        params.newMonthlyPayment
      ),
    };
  }

  /**
   * Formata moeda em Metical
   */
  formatCurrency(amount: number): string {
    const formatted = new Intl.NumberFormat('pt-MZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${formatted} MZN`;
  }

  /**
   * Formata percentagem
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }
}

export const calcService = new CalcService();