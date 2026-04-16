import { supabase } from '@/lib/supabase';
import { mapPaymentFromDb } from '@/lib/mappers/paymentMapper';
import { mapLoanFromDb } from '@/lib/mappers/loanMapper';
import { Loan, InstallmentPayment, PaymentMethod } from '@/models/types';
import { calcService } from '@/services/calcService';

export class PaymentService {
  async list(): Promise<InstallmentPayment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapPaymentFromDb);
  }

  async listByLoanId(loanId: string): Promise<InstallmentPayment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapPaymentFromDb);
  }

  async generateScheduleForLoan(loan: Loan): Promise<InstallmentPayment[]> {
    const existing = await this.listByLoanId(loan.id);
    if (existing.length > 0) {
      return existing;
    }

    const monthlyRate = loan.interestRate / 100;

    const schedule = calcService.calculateAmortizationSchedule(
      loan.principalAmount,
      monthlyRate,
      loan.termMonths
    );

    const baseDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date();

    const payload = schedule.map((item, index) => {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + index + 1);

      return {
        tenant_id: loan.tenantId,
        loan_id: loan.id,
        client_id: loan.clientId,
        installment_number: item.installmentNumber,
        due_date: dueDate.toISOString().split('T')[0],
        principal_due: Number(item.principal.toFixed(2)),
        interest_due: Number(item.interest.toFixed(2)),
        penalty_due: 0,
        total_due: Number(item.totalAmount.toFixed(2)),
        principal_paid: 0,
        interest_paid: 0,
        penalty_paid: 0,
        total_paid: 0,
        payment_date: null,
        payment_method: null,
        payment_reference: null,
        days_overdue: 0,
        status: 'pending' as const,
        processed_by: null,
        notes: null,
      };
    });

    const { data, error } = await supabase
      .from('payments')
      .insert(payload)
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapPaymentFromDb);
  }

  async registerPayment(
    paymentId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ): Promise<InstallmentPayment> {
    const { data: current, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const payment = mapPaymentFromDb(current);

    if (payment.status === 'paid') {
      throw new Error('Esta prestação já foi paga.');
    }

    const remaining = Number((payment.totalDue - payment.totalPaid).toFixed(2));

    if (amount <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    const appliedAmount = Math.min(amount, remaining);

    let toAllocate = appliedAmount;

    const penaltyRemaining = Number(
      (payment.penaltyDue - payment.penaltyPaid).toFixed(2)
    );
    const interestRemaining = Number(
      (payment.interestDue - payment.interestPaid).toFixed(2)
    );
    const principalRemaining = Number(
      (payment.principalDue - payment.principalPaid).toFixed(2)
    );

    const penaltyPaidNow = Math.min(toAllocate, Math.max(0, penaltyRemaining));
    toAllocate -= penaltyPaidNow;

    const interestPaidNow = Math.min(toAllocate, Math.max(0, interestRemaining));
    toAllocate -= interestPaidNow;

    const principalPaidNow = Math.min(
      toAllocate,
      Math.max(0, principalRemaining)
    );
    toAllocate -= principalPaidNow;

    const newPrincipalPaid = Number(
      (payment.principalPaid + principalPaidNow).toFixed(2)
    );
    const newInterestPaid = Number(
      (payment.interestPaid + interestPaidNow).toFixed(2)
    );
    const newPenaltyPaid = Number(
      (payment.penaltyPaid + penaltyPaidNow).toFixed(2)
    );
    const newTotalPaid = Number((payment.totalPaid + appliedAmount).toFixed(2));

    let newStatus: InstallmentPayment['status'] = 'partial';

    if (newTotalPaid <= 0) {
      newStatus = payment.daysOverdue > 0 ? 'overdue' : 'pending';
    } else if (newTotalPaid >= payment.totalDue) {
      newStatus = 'paid';
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('payments')
      .update({
        principal_paid: newPrincipalPaid,
        interest_paid: newInterestPaid,
        penalty_paid: newPenaltyPaid,
        total_paid: newTotalPaid,
        payment_date: now,
        payment_method: method,
        payment_reference: reference ?? null,
        status: newStatus,
        notes: notes ?? null,
        updated_at: now,
      })
      .eq('id', paymentId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.refreshLoanBalances(payment.loanId);

    return mapPaymentFromDb(data);
  }

  async refreshLoanBalances(loanId: string): Promise<void> {
    const payments = await this.listByLoanId(loanId);

    const { data: loanRow, error: loanFetchError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanFetchError) {
      throw new Error(loanFetchError.message);
    }

    const outstandingPrincipal = Number(
      payments
        .reduce((sum, p) => sum + (p.principalDue - p.principalPaid), 0)
        .toFixed(2)
    );

    const outstandingInterest = Number(
      payments
        .reduce(
          (sum, p) =>
            sum +
            (p.interestDue +
              p.penaltyDue -
              p.interestPaid -
              p.penaltyPaid),
          0
        )
        .toFixed(2)
    );

    const totalPaid = Number(
      payments.reduce((sum, p) => sum + p.totalPaid, 0).toFixed(2)
    );

    const nextPending = payments.find(
      (p) =>
        p.status === 'pending' ||
        p.status === 'partial' ||
        p.status === 'overdue'
    );

    let status = loanRow.status;

    if (outstandingPrincipal <= 0 && outstandingInterest <= 0) {
      status = 'closed';
    } else if (payments.some((p) => p.daysOverdue > 0 && p.status !== 'paid')) {
      status = 'in_arrears';
    } else if (loanRow.disbursed_at) {
      status = 'active';
    }

    const { error: updateError } = await supabase
      .from('loans')
      .update({
        outstanding_principal: outstandingPrincipal,
        outstanding_interest: outstandingInterest,
        total_paid: totalPaid,
        next_payment_date: nextPending?.dueDate ?? null,
        next_payment_amount: nextPending
          ? Number((nextPending.totalDue - nextPending.totalPaid).toFixed(2))
          : null,
        last_payment_date:
          totalPaid > 0
            ? new Date().toISOString().split('T')[0]
            : loanRow.last_payment_date,
        paid_off_at: status === 'closed' ? new Date().toISOString() : null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  async repairMissingSchedules(): Promise<{
    checked: number;
    repaired: number;
    skipped: number;
  }> {
    const { data: loanRows, error } = await supabase
      .from('loans')
      .select('*')
      .in('status', ['active', 'in_arrears', 'closed'])
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const loans = (loanRows ?? []).map(mapLoanFromDb);

    let repaired = 0;
    let skipped = 0;

    for (const loan of loans) {
      const existingPayments = await this.listByLoanId(loan.id);

      if (existingPayments.length > 0) {
        await this.refreshLoanBalances(loan.id);
        skipped++;
        continue;
      }

      await this.generateScheduleForLoan(loan);
      await this.refreshLoanBalances(loan.id);
      repaired++;
    }

    return {
      checked: loans.length,
      repaired,
      skipped,
    };
  }
}

export const paymentService = new PaymentService();