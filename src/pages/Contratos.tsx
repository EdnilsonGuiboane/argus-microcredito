import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Eye,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calcService } from '@/services/calcService';
import { auditService } from '@/services/auditService';
import {
  generateContractPDF,
  ContractPdfData,
} from '@/services/institutionalPdfService';
import { contractService } from '@/services/contracts/contractService';
import { clientService } from '@/services/clients/clientService';
import { applicationService } from '@/services/applications/applicationService';
import { productService } from '@/services/products/productService';
import { loanService } from '@/services/loans/loanService';
import {
  Contract,
  Client,
  LoanApplication,
  LoanProduct,
  Loan,
} from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export default function Contratos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  async function loadData() {
    try {
      setLoading(true);

      const [contractsData, clientsData, applicationsData, productsData, loansData] =
        await Promise.all([
          contractService.list(),
          clientService.list(),
          applicationService.list(),
          productService.list(),
          loanService.list(),
        ]);

      setContracts(
        [...contractsData].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setClients(clientsData);
      setApplications(applicationsData);
      setProducts(productsData);
      setLoans(loansData);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contratos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getApplication = (id: string) =>
    applications.find((a) => a.id === id);
  const getProduct = (id: string) => products.find((p) => p.id === id);
  const isContractDisbursed = (contractId: string) =>
    loans.some((l) => l.contractId === contractId);

  const filtered = useMemo(() => {
    return contracts.filter((contract) => {
      const client = getClient(contract.clientId);
      const matchesSearch =
        !search ||
        client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        contract.contractNumber.toLowerCase().includes(search.toLowerCase());

      const normalizedStatus = isContractDisbursed(contract.id)
        ? 'disbursed'
        : contract.status;

      const matchesStatus =
        filterStatus === 'all' || normalizedStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, clients, loans, search, filterStatus]);

  const getStatusBadge = (status: string, contractId: string) => {
    const isDisbursed = isContractDisbursed(contractId);

    if (isDisbursed) {
      return (
        <span className="status-badge bg-primary/15 text-primary">
          Desembolsado
        </span>
      );
    }

    const config: Record<string, { label: string; class: string }> = {
      generated: {
        label: 'Gerado',
        class: 'bg-info/15 text-info',
      },
      pending_signature: {
        label: 'Pendente Assinatura',
        class: 'bg-warning/15 text-warning',
      },
      signed: {
        label: 'Pronto p/ Desembolso',
        class: 'bg-success/15 text-success',
      },
      cancelled: {
        label: 'Cancelado',
        class: 'bg-destructive/15 text-destructive',
      },
    };

    const c = config[status] || {
      label: status,
      class: 'bg-muted text-muted-foreground',
    };

    return <span className={cn('status-badge', c.class)}>{c.label}</span>;
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewing(true);
  };

  const handleSign = async (contract: Contract) => {
    try {
      setSigningId(contract.id);

      // ajusta aqui conforme o teu contractService
      if ('markAsSigned' in contractService && typeof (contractService as any).markAsSigned === 'function') {
        await (contractService as any).markAsSigned(contract.id);
      } else if ('sign' in contractService && typeof (contractService as any).sign === 'function') {
        await (contractService as any).sign(contract.id);
      } else {
        throw new Error(
          'O contractService ainda não tem método para assinar contrato.'
        );
      }

      auditService.log(
        user?.id || '',
        user?.name || '',
        'ASSINAR_CONTRATO',
        'contract',
        contract.id,
        contract.contractNumber
      );

      toast({
        title: 'Contrato Assinado',
        description:
          'O contrato foi marcado como assinado e está pronto para desembolso.',
      });

      await loadData();
      setIsViewing(false);
    } catch (error) {
      console.error('Erro ao assinar contrato:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível assinar o contrato.',
        variant: 'destructive',
      });
    } finally {
      setSigningId(null);
    }
  };

  const handleExportContract = (contract: Contract) => {
    const client = getClient(contract.clientId);
    if (!client) {
      toast({
        title: 'Erro',
        description: 'Cliente do contrato não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    const schedule = calcService.calculateAmortizationSchedule(
      contract.principalAmount,
      contract.interestRate / 100,
      contract.termMonths
    );

    const startDate = new Date(contract.signedAt || contract.createdAt);

    const contractData: ContractPdfData = {
      contractNumber: contract.contractNumber,
      createdAt: contract.createdAt,
      signedAt: contract.signedAt,
      client: {
        fullName: client.fullName,
        biNumber: client.biNumber,
        phone: client.phone,
        nuit: client.nuit,
        address: client.address,
        district: client.district,
        province: client.province,
        employer: client.employer,
      },
      principalAmount: contract.principalAmount,
      interestRate: contract.interestRate,
      termMonths: contract.termMonths,
      monthlyPayment: contract.monthlyPayment,
      totalInterest: contract.totalInterest,
      totalAmount: contract.totalAmount,
      adminFee: contract.adminFee,
      netDisbursement: contract.netDisbursement,
      schedule: schedule.map((item, idx) => {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + idx + 1);

        return {
          installment: item.installmentNumber,
          principal: item.principal,
          interest: item.interest,
          total: item.totalAmount,
          balance: item.balanceAfter,
          dueDate: dueDate.toLocaleDateString('pt-MZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
        };
      }),
      emittedBy: user?.name || 'Sistema',
    };

    generateContractPDF(contractData);

    toast({
      title: 'Contrato exportado em PDF',
      description: 'Documento institucional descarregado com sucesso.',
    });
  };

  const generateSchedule = (contract: Contract) => {
    const schedule = calcService.calculateAmortizationSchedule(
      contract.principalAmount,
      contract.interestRate / 100,
      contract.termMonths
    );

    const startDate = new Date(contract.signedAt || contract.createdAt);

    return schedule.map((item, idx) => {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + idx + 1);

      return {
        ...item,
        dueDate: dueDate.toISOString().split('T')[0],
      };
    });
  };

  const client = selectedContract ? getClient(selectedContract.clientId) : null;
  const application = selectedContract
    ? getApplication(selectedContract.applicationId)
    : null;
  const product = application ? getProduct(application.productId) : null;
  const schedule = selectedContract ? generateSchedule(selectedContract) : [];
  const contractHistory = selectedContract
    ? auditService.getByEntity('contract', selectedContract.id)
    : [];

  const stats = useMemo(
    () => ({
      total: contracts.length,
      generated: contracts.filter((c) => c.status === 'generated').length,
      pending: contracts.filter((c) => c.status === 'pending_signature').length,
      signed: contracts.filter(
        (c) => c.status === 'signed' && !isContractDisbursed(c.id)
      ).length,
      disbursed: contracts.filter((c) => isContractDisbursed(c.id)).length,
      totalValue: contracts
        .filter((c) => c.status === 'signed' || isContractDisbursed(c.id))
        .reduce((sum, c) => sum + c.principalAmount, 0),
    }),
    [contracts, loans]
  );

  if (loading) {
    return <div className="p-6">A carregar contratos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">
            Gestão e acompanhamento dos contratos gerados
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Gerados</p>
            <p className="text-2xl font-bold text-info">{stats.generated}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pend. Assinatura</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Prontos Desembolso</p>
            <p className="text-2xl font-bold text-success">{stats.signed}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">
              {calcService.formatCurrency(stats.totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="generated">Gerado</SelectItem>
                <SelectItem value="pending_signature">Pendente Assinatura</SelectItem>
                <SelectItem value="signed">Pronto p/ Desembolso</SelectItem>
                <SelectItem value="disbursed">Desembolsado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Cliente</th>
                  <th>Capital</th>
                  <th>Prazo</th>
                  <th>Prestação</th>
                  <th>Estado</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contract, i) => {
                  const client = getClient(contract.clientId);

                  return (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleView(contract)}
                    >
                      <td className="font-medium">{contract.contractNumber}</td>
                      <td>{client?.fullName || contract.clientId}</td>
                      <td>{calcService.formatCurrency(contract.principalAmount)}</td>
                      <td>{contract.termMonths} meses</td>
                      <td>{calcService.formatCurrency(contract.monthlyPayment)}</td>
                      <td>{getStatusBadge(contract.status, contract.id)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(contract)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum contrato encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewing} onOpenChange={setIsViewing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Contrato {selectedContract?.contractNumber}
            </DialogTitle>
            <DialogDescription>
              {client?.fullName || selectedContract?.clientId} •{' '}
              {selectedContract
                ? isContractDisbursed(selectedContract.id)
                  ? 'Desembolsado'
                  : selectedContract.status === 'generated'
                  ? 'Gerado'
                  : selectedContract.status === 'pending_signature'
                  ? 'Pendente Assinatura'
                  : selectedContract.status === 'signed'
                  ? 'Pronto p/ Desembolso'
                  : selectedContract.status
                : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="schedule">Cronograma</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">
                      {client?.fullName || selectedContract.clientId}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-medium">{product?.name || '-'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Capital</p>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedContract.principalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Prazo</p>
                    <p className="font-medium">
                      {selectedContract.termMonths} meses
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Taxa de Juros
                    </p>
                    <p className="font-medium">
                      {selectedContract.interestRate}% ao mês
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Prestação Mensal
                    </p>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedContract.monthlyPayment)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total de Juros
                    </p>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedContract.totalInterest)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedContract.totalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Taxa Administrativa
                    </p>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedContract.adminFee)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Valor Líquido
                    </p>
                    <p className="font-medium text-success">
                      {calcService.formatCurrency(
                        selectedContract.netDisbursement
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(selectedContract.createdAt).toLocaleString('pt-MZ')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Assinado em</p>
                    <p className="font-medium">
                      {selectedContract.signedAt
                        ? new Date(selectedContract.signedAt).toLocaleString('pt-MZ')
                        : '-'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Juros</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Saldo Após</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((item) => (
                      <TableRow key={item.installmentNumber}>
                        <TableCell className="font-medium">
                          {item.installmentNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(item.dueDate).toLocaleDateString('pt-MZ')}
                        </TableCell>
                        <TableCell>
                          {calcService.formatCurrency(item.principal)}
                        </TableCell>
                        <TableCell>
                          {calcService.formatCurrency(item.interest)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {calcService.formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {calcService.formatCurrency(item.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {contractHistory.length > 0 ? (
                  <div className="space-y-2">
                    {contractHistory.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('pt-MZ')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          por {log.userName}
                        </p>
                        {log.details && <p className="text-sm mt-1">{log.details}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum histórico
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedContract && handleExportContract(selectedContract)
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>

            {selectedContract &&
              (selectedContract.status === 'generated' ||
                selectedContract.status === 'pending_signature') && (
                <Button
                  onClick={() => handleSign(selectedContract)}
                  disabled={signingId === selectedContract.id}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {signingId === selectedContract.id
                    ? 'A assinar...'
                    : 'Marcar como Assinado'}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}