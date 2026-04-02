import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  DollarSign,
  Send,
  Calendar,
  Bell,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { calcService } from '@/services/calcService';
import { auditService } from '@/services/auditService';
import { loanService } from '@/services/loans/loanService';
import { clientService } from '@/services/clients/clientService';
import { collectionService } from '@/services/collections/collectionService';
import { messageService } from '@/services/messages/messageService';
import type { MessageLog } from '@/lib/mappers/messageMapper';
import {
  Loan,
  Client,
  CollectionTask,
  CollectionInteraction,
} from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import SendMessageModal from '@/components/messaging/SendMessageModal';

export default function Cobrancas() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInteractionOpen, setIsInteractionOpen] = useState(false);
  const [interactionType, setInteractionType] =
    useState<CollectionInteraction['type']>('call');
  const [interactionOutcome, setInteractionOutcome] =
    useState<CollectionInteraction['outcome']>('contacted');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overdue');
  const [loading, setLoading] = useState(true);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [interactions, setInteractions] = useState<CollectionInteraction[]>([]);
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [sentTodayLoanIds, setSentTodayLoanIds] = useState<Set<string>>(new Set());

  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [msgType, setMsgType] = useState<'LATE' | 'REMINDER'>('LATE');
  const [msgClient, setMsgClient] = useState<Client | null>(null);
  const [msgLoan, setMsgLoan] = useState<Loan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [loansData, clientsData, interactionsData, tasksData, logsData] =
        await Promise.all([
          loanService.list(),
          clientService.list(),
          collectionService.listInteractions(),
          collectionService.listTasks(),
          messageService.list(),
        ]);

      setLoans(loansData);
      setClients(clientsData);
      setInteractions(interactionsData);
      setTasks(tasksData);
      setMessageLogs(logsData);

      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const sentToday = new Set(
        logsData
          .filter(
            (log) =>
              !!log.loanId &&
              new Date(log.createdAt) >= start
          )
          .map((log) => log.loanId!)
      );

      setSentTodayLoanIds(sentToday);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de cobranças.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const overdueLoans = useMemo(() => {
    return loans
      .filter((l) => l.status === 'in_arrears' && l.daysOverdue > 0)
      .sort(
        (a, b) =>
          b.daysOverdue - a.daysOverdue ||
          (b.outstandingPrincipal + b.outstandingInterest) -
            (a.outstandingPrincipal + a.outstandingInterest)
      );
  }, [loans]);

  const reminders = useMemo(() => {
    return tasks
      .filter((task) => task.status === 'pending')
      .map((task) => {
        const loan = loans.find((l) => l.id === task.loanId);
        const client = clients.find((c) => c.id === task.clientId);

        if (!loan || !client) return null;

        const dueDate = task.promiseDate || task.scheduledFor;
        const targetDate = new Date(dueDate);
        const today = new Date();

        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const amount = task.promiseAmount ?? loan.nextPaymentAmount ?? 0;

        return {
          task,
          loan,
          client,
          dueDate,
          amount,
          daysUntil: diffDays,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [tasks, loans, clients]);

  const getClient = (id: string) => clients.find((c) => c.id === id);

  const getLoanInteractions = (loanId: string) =>
    interactions
      .filter((i) => i.loanId === loanId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

  const filtered = useMemo(() => {
    return overdueLoans.filter((loan) => {
      const client = getClient(loan.clientId);

      return (
        !search ||
        client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        loan.loanNumber.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [overdueLoans, search, clients]);

  const getAgingBadge = (days: number) => {
    if (days <= 30)
      return { label: '1-30 dias', class: 'bg-warning/15 text-warning' };
    if (days <= 60)
      return { label: '31-60 dias', class: 'bg-orange-500/15 text-orange-500' };
    if (days <= 90)
      return { label: '61-90 dias', class: 'bg-destructive/15 text-destructive' };
    return {
      label: '90+ dias',
      class: 'bg-destructive text-destructive-foreground',
    };
  };

  const handleAddInteraction = async () => {
    if (!selectedLoan || !user) return;

    try {
      const userName = user.fullName || 'Utilizador';

      const newInteraction = await collectionService.createInteraction({
        tenantId: selectedLoan.tenantId,
        loanId: selectedLoan.id,
        clientId: selectedLoan.clientId,
        type: interactionType,
        outcome: interactionOutcome,
        notes: interactionNotes,
        nextAction:
          interactionOutcome === 'promise'
            ? 'Aguardar pagamento prometido'
            : undefined,
        nextActionDate: promiseDate || undefined,
        createdBy: user.id,
      });

      if (interactionOutcome === 'promise' && promiseDate) {
        await collectionService.createTask({
          tenantId: selectedLoan.tenantId,
          loanId: selectedLoan.id,
          clientId: selectedLoan.clientId,
          type: 'promise',
          status: 'pending',
          scheduledFor: promiseDate,
          promiseDate,
          promiseAmount: promiseAmount ? parseFloat(promiseAmount) : undefined,
          notes: interactionNotes,
        });
      }

      auditService.log(
        user.id,
        userName,
        'REGISTAR_INTERACAO_COBRANCA',
        'collectionInteraction',
        newInteraction.id,
        `${interactionType} - ${interactionOutcome}`
      );

      toast({
        title: 'Interacção Registada',
        description: 'A interacção de cobrança foi registada com sucesso.',
      });

      setIsInteractionOpen(false);
      setInteractionNotes('');
      setPromiseDate('');
      setPromiseAmount('');

      await loadData();
    } catch (error) {
      console.error('Erro ao registar interacção:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registar a interacção.',
        variant: 'destructive',
      });
    }
  };

  const openMessageModal = (
    client: Client,
    loan: Loan,
    type: 'LATE' | 'REMINDER'
  ) => {
    setMsgClient(client);
    setMsgLoan(loan);
    setMsgType(type);
    setMsgModalOpen(true);
  };

  const totalOverdueAmount = useMemo(() => {
    return overdueLoans.reduce(
      (sum, loan) =>
        sum + loan.outstandingPrincipal + loan.outstandingInterest,
      0
    );
  }, [overdueLoans]);

  const client = selectedLoan ? getClient(selectedLoan.clientId) : null;
  const loanInteractions = selectedLoan
    ? getLoanInteractions(selectedLoan.id)
    : [];
  const loanMsgLogs = selectedLoan
    ? messageLogs.filter((log) => log.loanId === selectedLoan.id)
    : [];

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'visit':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="p-6">A carregar cobranças...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground">
            {overdueLoans.length} empréstimos em atraso • {reminders.length}{' '}
            lembretes pendentes
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total em Atraso</p>
            <p className="text-2xl font-bold text-destructive">
              {overdueLoans.length}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">1-30 dias</p>
            <p className="text-2xl font-bold text-warning">
              {overdueLoans.filter((l) => l.daysOverdue <= 30).length}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">31-60 dias</p>
            <p className="text-2xl font-bold text-orange-500">
              {
                overdueLoans.filter(
                  (l) => l.daysOverdue > 30 && l.daysOverdue <= 60
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">61-90 dias</p>
            <p className="text-2xl font-bold text-destructive">
              {
                overdueLoans.filter(
                  (l) => l.daysOverdue > 60 && l.daysOverdue <= 90
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">90+ dias</p>
            <p className="text-2xl font-bold text-destructive">
              {overdueLoans.filter((l) => l.daysOverdue > 90).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated bg-destructive/5 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-destructive/80">
                Valor Total em Atraso
              </p>
              <p className="text-3xl font-bold text-destructive">
                {calcService.formatCurrency(totalOverdueAmount)}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-destructive/30" />
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Em Atraso ({overdueLoans.length})
          </TabsTrigger>

          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Lembretes ({reminders.length})
          </TabsTrigger>

          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico Mensagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente ou empréstimo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filtered.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Empréstimo</th>
                        <th>Saldo Devedor</th>
                        <th>Dias em Atraso</th>
                        <th>Última Interacção</th>
                        <th>Acções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((loan, i) => {
                        const loanClient = getClient(loan.clientId);
                        const lastInteraction = getLoanInteractions(loan.id)[0];
                        const aging = getAgingBadge(loan.daysOverdue);
                        const sentToday = sentTodayLoanIds.has(loan.id);

                        if (!loanClient) return null;

                        return (
                          <motion.tr
                            key={loan.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-muted/50"
                          >
                            <td>
                              <p className="font-medium">{loanClient.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {loanClient.phone}
                              </p>
                            </td>

                            <td className="font-medium">{loan.loanNumber}</td>

                            <td className="text-destructive font-medium">
                              {calcService.formatCurrency(
                                loan.outstandingPrincipal +
                                  loan.outstandingInterest
                              )}
                            </td>

                            <td>
                              <span className={cn('status-badge', aging.class)}>
                                {loan.daysOverdue} dias
                              </span>
                              {sentToday && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  ✉ Hoje
                                </Badge>
                              )}
                            </td>

                            <td className="text-muted-foreground text-sm">
                              {lastInteraction ? (
                                <div className="flex items-center gap-2">
                                  {getInteractionIcon(lastInteraction.type)}
                                  <span>
                                    {new Date(
                                      lastInteraction.createdAt
                                    ).toLocaleDateString('pt-MZ')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-warning">Nenhuma</span>
                              )}
                            </td>

                            <td>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLoan(loan);
                                    setIsDetailOpen(true);
                                  }}
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  Cobrar
                                </Button>

                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    openMessageModal(loanClient, loan, 'LATE')
                                  }
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Mensagem
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    Nenhum empréstimo em atraso
                  </h3>
                  <p className="text-muted-foreground">
                    Todos os pagamentos estão em dia
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Lembretes — Próximos 7 dias
              </CardTitle>
              <CardDescription>
                Pagamentos previstos para os próximos dias. Envie um lembrete ao
                cliente.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {reminders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Empréstimo</th>
                        <th>Valor Parcela</th>
                        <th>Data Vencimento</th>
                        <th>Dias</th>
                        <th>Acções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reminders.map((r, i) => {
                        const sentToday = sentTodayLoanIds.has(r.loan.id);

                        return (
                          <motion.tr
                            key={`${r.loan.id}-${r.dueDate}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                          >
                            <td>
                              <p className="font-medium">{r.client.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {r.client.phone}
                              </p>
                            </td>

                            <td className="font-medium">{r.loan.loanNumber}</td>

                            <td className="font-medium">
                              {calcService.formatCurrency(r.amount)}
                            </td>

                            <td>
                              {new Date(r.dueDate).toLocaleDateString('pt-MZ')}
                            </td>

                            <td>
                              <Badge
                                variant={
                                  r.daysUntil === 0 ? 'destructive' : 'outline'
                                }
                              >
                                {r.daysUntil === 0 ? 'Hoje' : `${r.daysUntil}d`}
                              </Badge>
                              {sentToday && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  ✉ Hoje
                                </Badge>
                              )}
                            </td>

                            <td>
                              <Button
                                size="sm"
                                onClick={() =>
                                  openMessageModal(r.client, r.loan, 'REMINDER')
                                }
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Lembrete
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
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    Sem lembretes pendentes
                  </h3>
                  <p className="text-muted-foreground">
                    Nenhum pagamento previsto para os próximos 7 dias
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Mensagens
              </CardTitle>
            </CardHeader>

            <CardContent>
              {messageLogs.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma mensagem enviada ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {messageLogs.slice(0, 100).map((log) => {
                    const logClient = getClient(log.clientId);

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-muted/50 rounded-lg flex gap-3 items-start"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            log.status === 'SENT'
                              ? 'bg-success/15 text-success'
                              : log.status === 'SKIPPED'
                              ? 'bg-warning/15 text-warning'
                              : 'bg-destructive/15 text-destructive'
                          )}
                        >
                          {log.channel === 'whatsapp'
                            ? 'WA'
                            : log.channel === 'sms'
                            ? 'SM'
                            : 'EM'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {logClient?.fullName || log.clientId}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.type}
                            </Badge>
                            <Badge
                              variant={
                                log.status === 'SENT'
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString('pt-MZ')}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {log.messageText}
                          </p>

                          {log.reason && (
                            <p className="text-xs text-destructive mt-1">
                              {log.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cobrança - {client?.fullName}</DialogTitle>
            <DialogDescription>
              {selectedLoan?.loanNumber} • {selectedLoan?.daysOverdue} dias em
              atraso
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && client && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="history">
                  Interacções ({loanInteractions.length})
                </TabsTrigger>
                <TabsTrigger value="messages">
                  Mensagens ({loanMsgLogs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{client.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Distrito</p>
                    <p className="font-medium">{client.district}</p>
                  </div>
                </div>

                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-destructive/80">Saldo Devedor</p>
                    <p className="text-2xl font-bold text-destructive">
                      {calcService.formatCurrency(
                        selectedLoan.outstandingPrincipal +
                          selectedLoan.outstandingInterest
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-destructive/80">
                      Dias em Atraso
                    </p>
                    <p className="text-2xl font-bold text-destructive">
                      {selectedLoan.daysOverdue}
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Referências
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{client.reference1.name}</p>
                      <p className="text-sm">{client.reference1.phone}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{client.reference2.name}</p>
                      <p className="text-sm">{client.reference2.phone}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-2">
                {loanInteractions.length > 0 ? (
                  loanInteractions.map((i) => (
                    <div
                      key={i.id}
                      className="p-3 bg-muted/50 rounded-lg flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                        {getInteractionIcon(i.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{i.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(i.createdAt).toLocaleString('pt-MZ')}
                          </span>
                        </div>
                        {i.notes && (
                          <p className="text-sm text-muted-foreground">
                            {i.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma interacção registada
                  </p>
                )}
              </TabsContent>

              <TabsContent value="messages" className="mt-4 space-y-2">
                {loanMsgLogs.length > 0 ? (
                  loanMsgLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.channel.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={
                            log.status === 'SENT'
                              ? 'default'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {log.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('pt-MZ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.messageText}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-destructive mt-1">
                          {log.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem enviada
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fechar
            </Button>

            {client && selectedLoan && (
              <Button
                variant="default"
                onClick={() => {
                  setIsDetailOpen(false);
                  openMessageModal(client, selectedLoan, 'LATE');
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
            )}

            <Button onClick={() => setIsInteractionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Registar Interacção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInteractionOpen} onOpenChange={setIsInteractionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Interacção</DialogTitle>
            <DialogDescription>{client?.fullName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={interactionType}
                onValueChange={(v) =>
                  setInteractionType(v as CollectionInteraction['type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Chamada</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="visit">Visita</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="promise">Promessa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resultado</Label>
              <Select
                value={interactionOutcome}
                onValueChange={(v) =>
                  setInteractionOutcome(
                    v as CollectionInteraction['outcome']
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacted">Contactado</SelectItem>
                  <SelectItem value="no_answer">Sem Resposta</SelectItem>
                  <SelectItem value="promise">Promessa de Pagamento</SelectItem>
                  <SelectItem value="refused">Recusou Pagar</SelectItem>
                  <SelectItem value="wrong_number">Número Errado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {interactionOutcome === 'promise' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Prometida</Label>
                  <Input
                    type="date"
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Valor Prometido</Label>
                  <Input
                    type="number"
                    value={promiseAmount}
                    onChange={(e) => setPromiseAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea
                value={interactionNotes}
                onChange={(e) => setInteractionNotes(e.target.value)}
                placeholder="Detalhes da interacção..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInteractionOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddInteraction}>Registar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {msgClient && msgLoan && (
        <SendMessageModal
          open={msgModalOpen}
          onOpenChange={setMsgModalOpen}
          client={msgClient}
          loan={msgLoan}
          type={msgType}
          onSent={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}