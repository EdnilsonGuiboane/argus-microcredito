import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote,
  Search,
  Clock,
  CheckCircle2,
  Download,
  CreditCard,
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
import { generateDisbursementPDF } from '@/services/receiptService';
import { contractService } from '@/services/contracts/contractService';
import { clientService } from '@/services/clients/clientService';
import { loanService } from '@/services/loans/loanService';
import { disbursementService } from '@/services/disbursements/disbursementService';
import {
  Contract,
  Client,
  Loan,
  Disbursement,
  PaymentMethod,
  PAYMENT_METHODS,
} from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function Desembolsos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [disbursementMethod, setDisbursementMethod] = useState<PaymentMethod>('mpesa');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  async function loadData() {
    try {
      setPageLoading(true);

      const [contractsData, disbursementsData, clientsData, loansData] = await Promise.all([
        contractService.list(),
        disbursementService.list(),
        clientService.list(),
        loanService.list(),
      ]);

      setContracts(contractsData);
      setDisbursements(disbursementsData);
      setClients(clientsData);
      setLoans(loansData);
    } catch (error) {
      console.error('Erro ao carregar desembolsos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de desembolsos.',
        variant: 'destructive',
      });
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getLoanByContractId = (contractId: string) => loans.find((l) => l.contractId === contractId);

  const readyContracts = useMemo(() => {
    const disbursedContractIds = new Set(loans.map((l) => l.contractId));

    return contracts.filter(
      (c) => c.status === 'signed' && !disbursedContractIds.has(c.id)
    );
  }, [contracts, loans]);

  const filtered = useMemo(() => {
    return readyContracts.filter((contract) => {
      const client = getClient(contract.clientId);

      return (
        !search ||
        client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        contract.contractNumber.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [readyContracts, search, clients]);

  const handleDisbursement = async () => {
    if (!selectedContract) return;

    setLoading(true);

    try {
      await disbursementService.disburseContract(
        selectedContract,
        disbursementMethod,
        reference || undefined,
        notes || undefined
      );

      toast({
        title: 'Desembolso Realizado',
        description: `${calcService.formatCurrency(
          selectedContract.netDisbursement
        )} desembolsado para ${getClient(selectedContract.clientId)?.fullName || 'cliente'}`,
      });

      setIsModalOpen(false);
      setSelectedContract(null);
      setDisbursementMethod('mpesa');
      setReference('');
      setNotes('');

      await loadData();
    } catch (error) {
      console.error('Erro ao desembolsar:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir o desembolso.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportVoucher = async (disbursement: Disbursement) => {
    if (!user) return;

    const client = getClient(disbursement.clientId);
    const contract = contracts.find((c) => c.id === disbursement.contractId);

    if (!client || !contract) {
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

    generateDisbursementPDF(
      disbursement,
      contract,
      client,
      user.id,
      user.fullName ,
      roleLabel
    );

    toast({
      title: 'Recibo PDF gerado com sucesso',
      description: 'O ficheiro PDF foi descarregado.',
    });
  };

  const totalDisbursedToday = useMemo(() => {
    const today = new Date().toDateString();

    return disbursements
      .filter((d) => new Date(d.disbursedAt).toDateString() === today)
      .reduce((sum, d) => sum + d.netAmount, 0);
  }, [disbursements]);

  const totalDisbursedMonth = useMemo(() => {
    const now = new Date();

    return disbursements
      .filter((d) => {
        const date = new Date(d.disbursedAt);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, d) => sum + d.netAmount, 0);
  }, [disbursements]);

  const client = selectedContract ? getClient(selectedContract.clientId) : null;

  if (pageLoading) {
    return <div className="p-6">A carregar desembolsos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Desembolsos</h1>
          <p className="text-muted-foreground">
            {readyContracts.length} contratos prontos para desembolso
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prontos para Desembolso</p>
                <p className="text-2xl font-bold text-warning">
                  {readyContracts.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Desembolsado Hoje</p>
                <p className="text-2xl font-bold text-success">
                  {calcService.formatCurrency(totalDisbursedToday)}
                </p>
              </div>
              <Banknote className="w-8 h-8 text-success/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Desembolsado Este Mês</p>
                <p className="text-2xl font-bold">
                  {calcService.formatCurrency(totalDisbursedMonth)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Contratos Prontos para Desembolso</h2>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente ou contrato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Cliente</th>
                      <th>Valor Bruto</th>
                      <th>Taxa Admin</th>
                      <th>Valor Líquido</th>
                      <th>Prazo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((contract, i) => {
                      const contractClient = getClient(contract.clientId);

                      return (
                        <motion.tr
                          key={contract.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                        >
                          <td className="font-medium">{contract.contractNumber}</td>
                          <td>{contractClient?.fullName || contract.clientId}</td>
                          <td>{calcService.formatCurrency(contract.principalAmount)}</td>
                          <td className="text-muted-foreground">
                            {calcService.formatCurrency(contract.adminFee)}
                          </td>
                          <td className="font-medium text-success">
                            {calcService.formatCurrency(contract.netDisbursement)}
                          </td>
                          <td>{contract.termMonths} meses</td>
                          <td>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedContract(contract);
                                setIsModalOpen(true);
                              }}
                            >
                              <Banknote className="w-4 h-4 mr-2" />
                              Desembolsar
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum contrato pendente</h3>
                <p className="text-muted-foreground">
                  Todos os contratos assinados já foram desembolsados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Desembolsos Recentes</h2>

        <Card className="card-elevated">
          <CardContent className="p-4">
            {disbursements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Valor Líquido</th>
                      <th>Método</th>
                      <th>Referência</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {disbursements.slice(0, 10).map((disb, i) => {
                      const disbClient = getClient(disb.clientId);

                      return (
                        <motion.tr
                          key={disb.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                        >
                          <td>{new Date(disb.disbursedAt).toLocaleDateString('pt-MZ')}</td>
                          <td className="font-medium">{disbClient?.fullName || disb.clientId}</td>
                          <td className="text-success font-medium">
                            {calcService.formatCurrency(disb.netAmount)}
                          </td>
                          <td>
                            <span className="status-badge bg-muted text-muted-foreground">
                              {PAYMENT_METHODS.find((m) => m.value === disb.method)?.label ||
                                disb.method}
                            </span>
                          </td>
                          <td className="text-muted-foreground">{disb.reference}</td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportVoucher(disb)}
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
                Nenhum desembolso registado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Desembolso</DialogTitle>
            <DialogDescription>
              {client?.fullName} • Contrato {selectedContract?.contractNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Bruto:</span>
                  <span>
                    {calcService.formatCurrency(selectedContract.principalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Administrativa:</span>
                  <span className="text-destructive">
                    -{calcService.formatCurrency(selectedContract.adminFee)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Valor Líquido a Desembolsar:</span>
                  <span className="text-success">
                    {calcService.formatCurrency(selectedContract.netDisbursement)}
                  </span>
                </div>
              </div>

              <div>
                <Label>Método de Pagamento</Label>
                <Select
                  value={disbursementMethod}
                  onValueChange={(v) => setDisbursementMethod(v as PaymentMethod)}
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
                  placeholder="Observações sobre o desembolso..."
                />
              </div>

              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm">
                  ✓ Ao confirmar, o empréstimo será activado e o desembolso será
                  registado no sistema
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDisbursement} disabled={loading}>
              <Banknote className="w-4 h-4 mr-2" />
              {loading ? 'A processar...' : 'Confirmar Desembolso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}