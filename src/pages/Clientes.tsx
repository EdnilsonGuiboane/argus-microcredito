import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditService } from '@/services/auditService';
import { calcService } from '@/services/calcService';
import { clientService } from '@/services/clients/clientService';
import { loanService } from '@/services/loans/loanService';
import { paymentService } from '@/services/payments/paymentService';
import {
  Client,
  Loan,
  AuditLog,
  InstallmentPayment,
} from '@/models/types';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';


export default function Clientes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [clientsData, loansData, paymentsData] = await Promise.all([
        clientService.list(),
        loanService.list(),
        paymentService.list(),
      ]);

      setClients(clientsData);
      setLoans(loansData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return clients;

    const q = search.toLowerCase();

    return clients.filter((c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.biNumber.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.nuit?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const getStatusBadge = (status: Client['status']) => {
    const styles: Record<Client['status'], string> = {
      pending: 'bg-warning/15 text-warning',
      active: 'bg-success/15 text-success',
      closed: 'bg-muted text-muted-foreground',
      rejected: 'bg-destructive/15 text-destructive',
      withdrawn: 'bg-muted text-muted-foreground',
      locked: 'bg-destructive text-destructive-foreground',
    };

    const labels: Record<Client['status'], string> = {
      pending: 'Pendente',
      active: 'Activo',
      closed: 'Fechado',
      rejected: 'Rejeitado',
      withdrawn: 'Desistiu',
      locked: 'Bloqueado',
    };

    return (
      <span className={cn('status-badge', styles[status])}>
        {labels[status]}
      </span>
    );
  };

  const getClientLoans = (clientId: string) =>
    loans.filter((l) => l.clientId === clientId);

  const getClientPayments = (clientId: string) =>
    payments
      .filter((p) => p.clientId === clientId && p.totalPaid > 0)
      .sort(
        (a, b) =>
          new Date(b.paymentDate || b.updatedAt).getTime() -
          new Date(a.paymentDate || a.updatedAt).getTime()
      );

  const getClientHistory = (clientId: string): AuditLog[] =>
    auditService.getByEntity('client', clientId);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleDelete = (client: Client) => {
    const clientLoans = getClientLoans(client.id);

    if (clientLoans.length > 0) {
      toast({
        title: 'Não é possível eliminar',
        description: 'Este cliente tem empréstimos registados.',
        variant: 'destructive',
      });
      return;
    }

    setClientToDelete(client);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      await clientService.delete(clientToDelete.id);

      auditService.log(
        user?.id || '',
        user?.fullName  || '',
        'ELIMINAR_CLIENTE',
        'client',
        clientToDelete.id,
        clientToDelete.fullName
      );

      toast({
        title: 'Cliente eliminado',
        description: 'O cliente foi removido do sistema.',
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao eliminar cliente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível eliminar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setClientToDelete(null);
    }
  };

  const clientLoans = selectedClient ? getClientLoans(selectedClient.id) : [];
  const clientPayments = selectedClient ? getClientPayments(selectedClient.id) : [];
  const clientHistory = selectedClient ? getClientHistory(selectedClient.id) : [];

  if (loading) {
    return <div className="p-6">A carregar clientes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes registados</p>
        </div>

        <Button
          onClick={() => {
            setSelectedClient(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, BI, NUIT ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>BI</th>
                  <th>Telefone</th>
                  <th>Distrito</th>
                  <th>Rendimento</th>
                  <th>Estado</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((client, i) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleView(client)}
                  >
                    <td className="font-medium">{client.fullName}</td>
                    <td className="text-muted-foreground">{client.biNumber}</td>
                    <td>{client.phone}</td>
                    <td>{client.district}</td>
                    <td>{calcService.formatCurrency(client.monthlyIncome)}</td>
                    <td>{getStatusBadge(client.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(client)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhe
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(client)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhum cliente encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Ajuste a pesquisa ou adicione um novo cliente
              </p>
              <Button
                onClick={() => {
                  setSelectedClient(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        client={selectedClient}
        onSuccess={async () => {
          await loadData();
        }}
      />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClient?.fullName}</DialogTitle>
            <DialogDescription>
              BI: {selectedClient?.biNumber} • {selectedClient?.phone}
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <Tabs defaultValue="data" className="mt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="loans">
                  Empréstimos ({clientLoans.length})
                </TabsTrigger>
                <TabsTrigger value="payments">
                  Pagamentos ({clientPayments.length})
                </TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Completo</p>
                    <p className="font-medium">{selectedClient.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Data de Nascimento
                    </p>
                    <p className="font-medium">
                      {new Date(selectedClient.dateOfBirth).toLocaleDateString(
                        'pt-MZ'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedClient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedClient.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">BI</p>
                    <p className="font-medium">{selectedClient.biNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NUIT</p>
                    <p className="font-medium">{selectedClient.nuit || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{selectedClient.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-medium">
                      {selectedClient.district}, {selectedClient.province}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ocupação</p>
                    <p className="font-medium">{selectedClient.occupation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empregador</p>
                    <p className="font-medium">{selectedClient.employer || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Rendimento Mensal
                    </p>
                    <p className="font-medium text-success">
                      {calcService.formatCurrency(selectedClient.monthlyIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Despesas Mensais
                    </p>
                    <p className="font-medium text-destructive">
                      {calcService.formatCurrency(selectedClient.monthlyExpenses)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Referência 1
                    </p>
                    <p className="font-medium">{selectedClient.reference1.name}</p>
                    <p className="text-sm">
                      {selectedClient.reference1.relationship} •{' '}
                      {selectedClient.reference1.phone}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Referência 2
                    </p>
                    <p className="font-medium">{selectedClient.reference2.name}</p>
                    <p className="text-sm">
                      {selectedClient.reference2.relationship} •{' '}
                      {selectedClient.reference2.phone}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="loans" className="mt-4">
                {clientLoans.length > 0 ? (
                  <div className="space-y-2">
                    {clientLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="p-3 bg-muted/50 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{loan.loanNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {calcService.formatCurrency(loan.principalAmount)} •{' '}
                            {loan.termMonths} meses
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {calcService.formatCurrency(
                              loan.outstandingPrincipal + loan.outstandingInterest
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum empréstimo
                  </p>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                {clientPayments.length > 0 ? (
                  <div className="space-y-2">
                    {clientPayments.slice(0, 10).map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 bg-muted/50 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">
                            Parcela {payment.installmentNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              payment.paymentDate || payment.updatedAt
                            ).toLocaleDateString('pt-MZ')}
                          </p>
                        </div>
                        <p className="font-medium text-success">
                          {calcService.formatCurrency(payment.totalPaid)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pagamento
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {clientHistory.length > 0 ? (
                  <div className="space-y-2">
                    {clientHistory.map((log) => (
                      <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
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
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser desfeita. O cliente "
              {clientToDelete?.fullName}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}