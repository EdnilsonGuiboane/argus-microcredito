// src/services/portfolio/portfolioService.ts
import { loanService } from '@/services/loans/loanService';
import { paymentService } from '@/services/payments/paymentService';
import { Loan, InstallmentPayment } from '@/models/types';

export interface AgingBuckets {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
}

export interface PortfolioStats {
  activePortfolio: number;
  totalLoans: number;
  activeLoans: number;
  inArrearsLoans: number;
  totalOutstandingPrincipal: number;
  totalOutstandingInterest: number;
  overdueAmount: number;
  receivedThisMonth: number;
  delinquencyRate: number;
  agingBuckets: AgingBuckets;
}

export class PortfolioService {
  private calculateDaysOverdue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  private isOpenPayment(payment: InstallmentPayment): boolean {
    return payment.status === 'pending' || payment.status === 'partial' || payment.status === 'overdue';
  }

  async getStats(): Promise<PortfolioStats> {
    const [loans, payments] = await Promise.all([
      loanService.list(),
      paymentService.list(),
    ]);

    const activeStatuses: Loan['status'][] = ['active', 'in_arrears'];
    const activeLoans = loans.filter((l) => activeStatuses.includes(l.status));
    const inArrearsLoans = loans.filter((l) => l.status === 'in_arrears');

    const totalOutstandingPrincipal = Number(
      activeLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0).toFixed(2)
    );

    const totalOutstandingInterest = Number(
      activeLoans.reduce((sum, loan) => sum + loan.outstandingInterest, 0).toFixed(2)
    );

    const activePortfolio = Number(
      activeLoans.reduce(
        (sum, loan) => sum + loan.outstandingPrincipal + loan.outstandingInterest,
        0
      ).toFixed(2)
    );

    const openPayments = payments.filter(this.isOpenPayment.bind(this));

    const overduePayments = openPayments
      .map((payment) => {
        const days = this.calculateDaysOverdue(payment.dueDate);
        return {
          ...payment,
          computedDaysOverdue: days,
          remainingAmount: Number((payment.totalDue - payment.totalPaid).toFixed(2)),
        };
      })
      .filter((payment) => payment.computedDaysOverdue > 0);

    const overdueAmount = Number(
      overduePayments.reduce((sum, payment) => sum + payment.remainingAmount, 0).toFixed(2)
    );

    const agingBuckets: AgingBuckets = overduePayments.reduce(
      (acc, payment) => {
        const amount = payment.remainingAmount;
        const days = payment.computedDaysOverdue;

        if (days <= 30) acc.days1_30 += amount;
        else if (days <= 60) acc.days31_60 += amount;
        else if (days <= 90) acc.days61_90 += amount;
        else acc.days90Plus += amount;

        return acc;
      },
      {
        current: Number(
          openPayments
            .map((payment) => {
              const days = this.calculateDaysOverdue(payment.dueDate);
              return days === 0
                ? Number((payment.totalDue - payment.totalPaid).toFixed(2))
                : 0;
            })
            .reduce((sum, amount) => sum + amount, 0)
            .toFixed(2)
        ),
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
      }
    );

    agingBuckets.days1_30 = Number(agingBuckets.days1_30.toFixed(2));
    agingBuckets.days31_60 = Number(agingBuckets.days31_60.toFixed(2));
    agingBuckets.days61_90 = Number(agingBuckets.days61_90.toFixed(2));
    agingBuckets.days90Plus = Number(agingBuckets.days90Plus.toFixed(2));

    const now = new Date();
    const receivedThisMonth = Number(
      payments
        .filter((payment) => {
          if (!payment.paymentDate || payment.totalPaid <= 0) return false;
          const paidDate = new Date(payment.paymentDate);
          return (
            paidDate.getMonth() === now.getMonth() &&
            paidDate.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, payment) => sum + payment.totalPaid, 0)
        .toFixed(2)
    );

    const delinquencyRate =
      activePortfolio > 0
        ? Number(((overdueAmount / activePortfolio) * 100).toFixed(2))
        : 0;

    return {
      activePortfolio,
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      inArrearsLoans: inArrearsLoans.length,
      totalOutstandingPrincipal,
      totalOutstandingInterest,
      overdueAmount,
      receivedThisMonth,
      delinquencyRate,
      agingBuckets,
    };
  }
}

export const portfolioService = new PortfolioService();