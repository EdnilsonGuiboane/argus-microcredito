import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  Download,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { calcService } from '@/services/calcService';
import { generatePaymentPDF } from '@/services/receiptService';
import { agingService } from '@/services/agingService';
import { clientService } from '@/services/clients/clientService';
import { loanService } from '@/services/loans/loanService';
import { paymentService } from '@/services/payments/paymentService';
import {
  Loan,
  Client,
  PaymentMethod,
  PAYMENT_METHODS,
  InstallmentPayment,
} from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function Pagamentos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<InstallmentPayment | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      void loadData();
    }
  }, [isModalOpen]);

  async function loadData() {
    try {
      setPageLoading(true);

      await agingService.recalculateAging();

      const [loansData, paymentsData, clientsData] = await Promise.all([
        loanService.list(),
        paymentService.list(),
        clientService.list(),
      ]);
      console.log('LOANS RAW PAGAMENTOS:', loansData);
      console.log('PAYMENTS RAW PAGAMENTOS:', paymentsData);

      const eligibleLoans = loansData.filter((loan) => {
        const outstandingTotal =
          (loan.outstandingPrincipal || 0) + (loan.outstandingInterest || 0);

        const hasDisbursement = !!loan.disbursedAt;
        const hasOutstanding = outstandingTotal > 0;
        const isNotClosed =
          loan.status !== 'closed' && loan.status !== 'cancelled';

        return hasDisbursement && hasOutstanding && isNotClosed;
      });

      setLoans(eligibleLoans);
      setPayments(paymentsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de pagamentos.',
        variant: 'destructive',
      });
    } finally {
      setPageLoading(false);
    }
  }

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getLoan = (id: string) => loans.find((l) => l.id === id);

  const paymentsHistory = useMemo(() => {
    return payments
      .filter((p) => p.totalPaid > 0)
      .sort(
        (a, b) =>
          new Date(b.paymentDate || b.updatedAt).getTime() -
          new Date(a.paymentDate || a.updatedAt).getTime()
      );
  }, [payments]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const client = getClient(loan.clientId);

      return (
        !search ||
        client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        loan.loanNumber.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [loans, search, clients]);

  const getNextPendingInstallment = (loanId: string) => {
    return payments.find(
      (p) =>
        p.loanId === loanId &&
        (p.status === 'pending' ||
          p.status === 'partial' ||
          p.status === 'overdue')
    );
  };

  const handleRegisterPayment = async () => {
    if (!selectedLoan || !selectedInstallment || !amount) return;

    const paymentAmount = parseFloat(amount);

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Erro',
        description: 'Insira um valor válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      await paymentService.registerPayment(
        selectedInstallment.id,
        paymentAmount,
        paymentMethod,
        reference || undefined,
        notes || undefined
      );

      toast({
        title: 'Pagamento registado',
        description: 'Pagamento aplicado com sucesso.',
      });

      setIsModalOpen(false);
      setSelectedLoan(null);
      setSelectedInstallment(null);
      setAmount('');
      setPaymentMethod('mpesa');
      setReference('');
      setNotes('');

      await loadData();
    } catch (error) {
      console.error('Erro ao registar pagamento:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível registar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReceipt = (payment: InstallmentPayment) => {
    if (!user) return;

    const paymentClient = clients.find((c) => c.id === payment.clientId);

    const paymentLoan =
      loans.find((l) => l.id === payment.loanId) ||
      null;

    if (!paymentClient || !paymentLoan) {
      toast({
        title: 'Erro',
        description: 'Não foi possível localizar os dados do recibo.',
        variant: 'destructive',
      });
      return;
    }

    const roleLabel =
      user.role === 'admin'
        ? 'Administrador'
        : user.role === 'analyst'
        ? 'Analista'
        : 'Caixa';

    generatePaymentPDF(
      {
        id: payment.id,
        tenantId: payment.tenantId,
        loanId: payment.loanId,
        clientId: payment.clientId,
        installmentId: payment.id,
        amount: payment.totalPaid,
        principalPaid: payment.principalPaid,
        interestPaid: payment.interestPaid,
        penaltyPaid: payment.penaltyPaid,
        paymentMethod: payment.paymentMethod || 'cash',
        reference: payment.paymentReference,
        receiptNumber: `REC-${payment.installmentNumber}-${payment.id.slice(0, 8)}`,
        paymentDate: (payment.paymentDate || payment.updatedAt).split('T')[0],
        reversed: false,
        processedAt: payment.paymentDate || payment.updatedAt,
        processedBy: payment.processedBy || user.id,
        notes: payment.notes,
        createdAt: payment.createdAt,
      },
      paymentLoan,
      paymentClient,
      user.id,
      user.fullName || 'Sistema',
      roleLabel
    );

    toast({
      title: 'Recibo PDF gerado com sucesso',
      description: 'O ficheiro PDF foi descarregado.',
    });
  };

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();

    return paymentsHistory
      .filter(
        (p) =>
          new Date(p.paymentDate || p.updatedAt).toDateString() === today
      )
      .reduce((sum, p) => sum + p.totalPaid, 0);
  }, [paymentsHistory]);

  const totalMonth = useMemo(() => {
    const now = new Date();

    return paymentsHistory
      .filter((p) => {
        const date = new Date(p.paymentDate || p.updatedAt);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + p.totalPaid, 0);
  }, [paymentsHistory]);

  const client = selectedLoan ? getClient(selectedLoan.clientId) : null;

  if (pageLoading) {
    return <div className="p-6">A carregar pagamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">
            Registo e gestão de pagamentos
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pagamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido Hoje</p>
                <p className="text-2xl font-bold text-success">
                  {calcService.formatCurrency(totalToday)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido Este Mês</p>
                <p className="text-2xl font-bold">
                  {calcService.formatCurrency(totalMonth)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
                <p className="text-2xl font-bold">{paymentsHistory.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Pesquisar por cliente ou número do empréstimo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4">Pagamentos Recentes</h2>

          {paymentsHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Empréstimo</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.slice(0, 15).map((payment, i) => {
                    const paymentClient = clients.find(
                      (c) => c.id === payment.clientId
                    );
                    const paymentLoan = loans.find((l) => l.id === payment.loanId);

                    return (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <td className="font-medium">
                          Parcela {payment.installmentNumber}
                        </td>
                        <td>
                          {new Date(
                            payment.paymentDate || payment.updatedAt
                          ).toLocaleDateString('pt-MZ')}
                        </td>
                        <td>{paymentClient?.fullName}</td>
                        <td className="text-muted-foreground">
                          {paymentLoan?.loanNumber}
                        </td>
                        <td className="font-medium text-success">
                          {calcService.formatCurrency(payment.totalPaid)}
                        </td>
                        <td>
                          <span className="status-badge bg-muted text-muted-foreground">
                            {PAYMENT_METHODS.find(
                              (m) => m.value === payment.paymentMethod
                            )?.label || payment.paymentMethod}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportReceipt(payment)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento registado
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedLoan(null);
            setSelectedInstallment(null);
            setAmount('');
            setReference('');
            setNotes('');
            setPaymentMethod('mpesa');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registar Pagamento</DialogTitle>
            <DialogDescription>
              Selecione o empréstimo e registe o pagamento da próxima prestação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Empréstimo</Label>
              <Select
                value={selectedLoan?.id || ''}
                onValueChange={(v) => {
                  const loan = loans.find((l) => l.id === v) || null;
                  setSelectedLoan(loan);

                  if (loan) {
                    const nextInstallment = getNextPendingInstallment(loan.id);
                    setSelectedInstallment(nextInstallment || null);
                    setAmount(
                      nextInstallment
                        ? String(
                            Number(
                              (
                                nextInstallment.totalDue -
                                nextInstallment.totalPaid
                              ).toFixed(2)
                            )
                          )
                        : ''
                    );
                  } else {
                    setSelectedInstallment(null);
                    setAmount('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um empréstimo..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredLoans.map((loan) => {
                    const loanClient = getClient(loan.clientId);
                    return (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.loanNumber} - {loanClient?.fullName}
                        {loan.daysOverdue > 0
                          ? ` (${loan.daysOverdue} dias atraso)`
                          : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedLoan && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{client?.fullName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Devedor:</span>
                  <span className="font-medium">
                    {calcService.formatCurrency(
                      selectedLoan.outstandingPrincipal +
                        selectedLoan.outstandingInterest
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próxima Parcela:</span>
                  <span className="font-medium">
                    {selectedInstallment
                      ? calcService.formatCurrency(
                          selectedInstallment.totalDue -
                            selectedInstallment.totalPaid
                        )
                      : calcService.formatCurrency(
                          selectedLoan.nextPaymentAmount || 0
                        )}
                  </span>
                </div>

                {selectedInstallment && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capital:</span>
                      <span>
                        {calcService.formatCurrency(
                          selectedInstallment.principalDue -
                            selectedInstallment.principalPaid
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Juros:</span>
                      <span>
                        {calcService.formatCurrency(
                          selectedInstallment.interestDue -
                            selectedInstallment.interestPaid
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Multa:</span>
                      <span>
                        {calcService.formatCurrency(
                          selectedInstallment.penaltyDue -
                            selectedInstallment.penaltyPaid
                        )}
                      </span>
                    </div>
                  </>
                )}

                {selectedLoan.daysOverdue > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Dias em Atraso:</span>
                    <span className="font-medium">
                      {selectedLoan.daysOverdue} dias
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Valor do Pagamento (MZN)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {selectedInstallment && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sugestão:{' '}
                  {calcService.formatCurrency(
                    selectedInstallment.totalDue -
                      selectedInstallment.totalPaid
                  )}{' '}
                  (valor restante da próxima parcela)
                </p>
              )}
            </div>

            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Referência / Número de Transacção</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: TXN123456789"
              />
            </div>

            <div>
              <Label>Notas (Opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o pagamento..."
              />
            </div>

            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm">
                ✓ Alocação automática: Multa → Juros → Capital
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterPayment}
              disabled={!selectedLoan || !selectedInstallment || !amount || loading}
            >
              <Receipt className="w-4 h-4 mr-2" />
              {loading ? 'A processar...' : 'Registar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}