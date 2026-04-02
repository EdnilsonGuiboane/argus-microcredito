// Aging Service - Daily recalculation of overdue status and buckets
import { storageService } from './storageService';
import { Loan, PaymentScheduleItem } from '@/models/types';

export interface AgingBuckets {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
}

export interface PortfolioStats {
  totalActiveLoans: number;
  totalActiveAmount: number;
  totalOverdueLoans: number;
  totalOverdueAmount: number;
  delinquencyRate: number;
  agingBuckets: AgingBuckets;
}

class AgingService {
  private lastRecalculation: string | null = null;

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / oneDay);
  }

  /**
   * Recalculate overdue status for all loans and installments
   * Should be called on app startup and periodically
   */
  recalculateAging(): void {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Skip if already recalculated today
    if (this.lastRecalculation === todayStr) {
      return;
    }

    const loans = storageService.getAll<Loan>('loans');
    
    loans.forEach(loan => {
      if (!['active', 'overdue'].includes(loan.status)) {
        return;
      }

      let hasOverdueInstallment = false;
      let maxDaysOverdue = 0;
      let overdueAmount = 0;

      // Update each installment
      const updatedSchedule: PaymentScheduleItem[] = loan.schedule.map(item => {
        if (item.status === 'paid') {
          return item;
        }

        const dueDate = new Date(item.dueDate);
        const daysOverdue = this.daysBetween(dueDate, today);

        if (daysOverdue > 0 && item.paidAmount < item.totalAmount) {
          hasOverdueInstallment = true;
          maxDaysOverdue = Math.max(maxDaysOverdue, daysOverdue);
          overdueAmount += item.totalAmount - item.paidAmount;
          
          return {
            ...item,
            status: 'overdue' as const,
          };
        }

        return item;
      });

      // Update loan status and days overdue
      const newStatus = hasOverdueInstallment ? 'overdue' : 'active';
      
      if (loan.status !== newStatus || loan.daysOverdue !== maxDaysOverdue) {
        storageService.update('loans', loan.id, {
          status: newStatus,
          daysOverdue: maxDaysOverdue,
          schedule: updatedSchedule,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    this.lastRecalculation = todayStr;
    console.log('[AgingService] Recalculation completed:', todayStr);
  }

  /**
   * Get aging bucket for a loan based on days overdue
   */
  getAgingBucket(daysOverdue: number): keyof AgingBuckets {
    if (daysOverdue === 0) return 'current';
    if (daysOverdue <= 30) return 'days1_30';
    if (daysOverdue <= 60) return 'days31_60';
    if (daysOverdue <= 90) return 'days61_90';
    return 'days90Plus';
  }

  /**
   * Calculate portfolio statistics
   */
  getPortfolioStats(): PortfolioStats {
    const loans = storageService.getAll<Loan>('loans');
    const activeLoans = loans.filter(l => ['active', 'overdue'].includes(l.status));
    
    const buckets: AgingBuckets = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
    };

    let totalOverdueLoans = 0;
    let totalOverdueAmount = 0;
    let totalActiveAmount = 0;

    activeLoans.forEach(loan => {
      const bucket = this.getAgingBucket(loan.daysOverdue);
      buckets[bucket] += loan.outstandingPrincipal;
      totalActiveAmount += loan.outstandingPrincipal;

      if (loan.status === 'overdue') {
        totalOverdueLoans++;
        totalOverdueAmount += loan.outstandingPrincipal;
      }
    });

    const delinquencyRate = totalActiveAmount > 0 
      ? (totalOverdueAmount / totalActiveAmount) * 100 
      : 0;

    return {
      totalActiveLoans: activeLoans.length,
      totalActiveAmount,
      totalOverdueLoans,
      totalOverdueAmount,
      delinquencyRate,
      agingBuckets: buckets,
    };
  }

  /**
   * Force recalculation (ignore cache)
   */
  forceRecalculate(): void {
    this.lastRecalculation = null;
    this.recalculateAging();
  }
}

export const agingService = new AgingService();
