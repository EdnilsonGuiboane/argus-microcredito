import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Search,
  FileText,
  Eye,
  Download,
  Check,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { calcService } from '@/services/calcService';
import {
  generateParecerPDF,
  ParecerData,
} from '@/services/institutionalPdfService';
import { applicationService } from '@/services/applications/applicationService';
import { clientService } from '@/services/clients/clientService';
import { LoanApplication, Client, LoanProduct } from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { contractService } from '@/services/contracts/contractService';
import { productService } from '@/services/products/productService';
import {
  applicationDocumentService,
  type ApplicationDocument,
} from '@/services/documents/applicationDocumentService';

const REQUIRED_DOCUMENT_TYPES = ['bi_copy', 'proof_of_address', 'proof_of_income'];
const DOCUMENT_LABELS: Record<string, string> = {
  bi_copy: 'Bilhete de Identidade',
  proof_of_address: 'Comprovativo de Residência',
  proof_of_income: 'Comprovativo de Rendimento',
  bank_statement: 'Extracto Bancário (3 meses)',
  employer_statement: 'Declaração do Empregador',
  other: 'Outro Documento',
};

export default function Analise() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [conditions, setConditions] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);

  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});

  async function loadData() {
    try {
      setLoading(true);

      const [apps, cls, prods] = await Promise.all([
        applicationService.list(),
        clientService.list(),
        productService.list(),
      ]);

      const filteredApps = apps
        .filter((a) => ['submitted', 'under_review', 'pending_documents'].includes(a.status))
        .sort((a, b) => {
          const statusOrder = { under_review: 0, submitted: 1, pending_documents: 2 };
          const riskOrder = { high: 0, medium: 1, low: 2 };

          const statusDiff =
            (statusOrder[a.status as keyof typeof statusOrder] ?? 3) -
            (statusOrder[b.status as keyof typeof statusOrder] ?? 3);

          if (statusDiff !== 0) return statusDiff;

          const riskDiff =
            (riskOrder[(a.riskLevel || 'medium') as keyof typeof riskOrder] ?? 1) -
            (riskOrder[(b.riskLevel || 'medium') as keyof typeof riskOrder] ?? 1);

          if (riskDiff !== 0) return riskDiff;

          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      setApplications(filteredApps);
      setClients(cls);
      setProducts(prods);

      if (selectedApp) {
        const updatedSelected = filteredApps.find((a) => a.id === selectedApp.id) || null;
        setSelectedApp(updatedSelected);
      }
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da análise.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(applicationId: string) {
    try {
      setLoadingDocuments(true);
      const docs = await applicationDocumentService.listByApplication(applicationId);
      setDocuments(docs);
      setDocumentNotes(
        Object.fromEntries(docs.map((d) => [d.id, d.reviewNotes || '']))
      );
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getProduct = (id: string) => products.find((p) => p.id === id);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const client = getClient(app.clientId);

      const matchesSearch =
        !search ||
        client?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        app.id.toLowerCase().includes(search.toLowerCase());

      const matchesRisk = filterRisk === 'all' || app.riskLevel === filterRisk;

      return matchesSearch && matchesRisk;
    });
  }, [applications, search, filterRisk, clients]);

  const getRiskBadge = (risk?: string) => {
    const config = {
      low: { label: 'Baixo', class: 'bg-success/15 text-success' },
      medium: { label: 'Médio', class: 'bg-warning/15 text-warning' },
      high: { label: 'Alto', class: 'bg-destructive/15 text-destructive' },
    };

    const c = config[risk as keyof typeof config] || config.medium;
    return <span className={cn('status-badge', c.class)}>{c.label}</span>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      submitted: { label: 'Submetida', class: 'bg-info/15 text-info' },
      under_review: { label: 'Em Análise', class: 'bg-primary/15 text-primary' },
      pending_documents: { label: 'Docs Pendentes', class: 'bg-warning/15 text-warning' },
    };

    const c = config[status] || {
      label: status,
      class: 'bg-muted text-muted-foreground',
    };

    return <span className={cn('status-badge', c.class)}>{c.label}</span>;
  };

  async function handleStartAnalysis(app: LoanApplication) {
    try {
      setProcessingId(app.id);

      if (app.status === 'submitted') {
        await applicationService.startReview(app.id);
      }

      await loadData();

      const refreshedApp = await applicationService.getById(app.id);

      setSelectedApp(refreshedApp || app);
      setApprovedAmount((refreshedApp?.requestedAmount || app.requestedAmount).toString());
      setIsAnalyzing(true);

      await loadDocuments(app.id);
    } catch (error) {
      console.error('Erro ao iniciar análise:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a análise.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleViewDocument(doc: ApplicationDocument) {
    try {
      const url = await applicationDocumentService.getSignedUrl(doc.filePath);
      await applicationDocumentService.markViewed(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
      await loadDocuments(doc.applicationId);
    } catch (error) {
      console.error('Erro ao abrir documento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o documento.',
        variant: 'destructive',
      });
    }
  }

  async function handleDownloadDocument(doc: ApplicationDocument) {
    try {
      const url = await applicationDocumentService.getSignedUrl(doc.filePath);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      await applicationDocumentService.markViewed(doc.id);
      await loadDocuments(doc.applicationId);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o documento.',
        variant: 'destructive',
      });
    }
  }

  async function handleReviewDocument(
    doc: ApplicationDocument,
    reviewStatus: 'valid' | 'invalid'
  ) {
    try {
      await applicationDocumentService.reviewDocument({
        documentId: doc.id,
        reviewedBy: user?.id,
        reviewStatus,
        reviewNotes: documentNotes[doc.id] || '',
      });

      toast({
        title: 'Documento revisto',
        description:
          reviewStatus === 'valid'
            ? 'Documento marcado como válido.'
            : 'Documento marcado como inválido.',
      });

      await loadDocuments(doc.applicationId);
    } catch (error) {
      console.error('Erro ao rever documento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o documento.',
        variant: 'destructive',
      });
    }
  }

  function validateRequiredDocumentsBeforeApproval() {
    const requiredDocs = documents.filter((d) =>
      REQUIRED_DOCUMENT_TYPES.includes(d.documentType)
    );

    const hasAllRequired = REQUIRED_DOCUMENT_TYPES.every((type) =>
      requiredDocs.some((d) => d.documentType === type)
    );

    const allRequiredValid = REQUIRED_DOCUMENT_TYPES.every((type) =>
      requiredDocs.some((d) => d.documentType === type && d.reviewStatus === 'valid')
    );

    if (!hasAllRequired) {
      toast({
        title: 'Documentação incompleta',
        description: 'Nem todos os documentos obrigatórios foram carregados.',
        variant: 'destructive',
      });
      return false;
    }

    if (!allRequiredValid) {
      toast({
        title: 'Documentação não validada',
        description:
          'Valide todos os documentos obrigatórios antes de aprovar.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }

  const handleDecision = async () => {
    if (!selectedApp || !decision) return;

    try {
      setProcessingId(selectedApp.id);

      if (decision === 'approve') {
        if (!validateRequiredDocumentsBeforeApproval()) {
          return;
        }

        const amount = parseFloat(approvedAmount) || selectedApp.requestedAmount;

        await applicationService.approveApplication(
          selectedApp.id,
          amount,
          conditions
        );

        const updatedApp = await applicationService.getById(selectedApp.id);

        if (!updatedApp) {
          throw new Error('Aplicação aprovada, mas não foi possível recarregar os dados.');
        }

        const existingContract = await contractService.getByApplicationId(updatedApp.id);

        if (!existingContract) {
          const product = products.find((p) => p.id === updatedApp.productId);

          if (!product) {
            throw new Error('Produto não encontrado para gerar o contrato.');
          }

          await contractService.createFromApprovedApplication(updatedApp, product);
        }

        toast({
          title: 'Solicitação Aprovada',
          description: `Crédito de ${calcService.formatCurrency(amount)} aprovado com sucesso.`,
        });
      } else {
        if (!decisionReason.trim()) {
          toast({
            title: 'Erro',
            description: 'Informe o motivo da rejeição.',
            variant: 'destructive',
          });
          return;
        }

        await applicationService.rejectApplication(
          selectedApp.id,
          decisionReason
        );

        toast({
          title: 'Solicitação Rejeitada',
          description: 'A solicitação foi rejeitada com sucesso.',
          variant: 'destructive',
        });
      }

      setIsDeciding(false);
      setIsAnalyzing(false);
      setSelectedApp(null);
      setDecision(null);
      setDecisionReason('');
      setApprovedAmount('');
      setConditions('');
      setDocuments([]);
      setDocumentNotes({});

      await loadData();
    } catch (error) {
      console.error('ERRO AO DECIDIR:', error);

      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir a decisão.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportDecision = () => {
    if (!selectedApp) return;

    const client = getClient(selectedApp.clientId);
    const product = getProduct(selectedApp.productId);

    if (!client || !product) return;

    const monthlyRate = selectedApp.interestRate / 100;
    const monthlyPayment = calcService.calculateMonthlyPayment(
      selectedApp.requestedAmount,
      monthlyRate,
      selectedApp.termMonths
    );

    const schedule = calcService.calculateAmortizationSchedule(
      selectedApp.requestedAmount,
      monthlyRate,
      selectedApp.termMonths
    );

    const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
    const totalAmount = selectedApp.requestedAmount + totalInterest;

    const parecerData: ParecerData = {
      applicationId: selectedApp.id,
      analystName: user?.fullName || 'N/A',
      analystRole: 'Analista de Crédito',
      client: {
        fullName: client.fullName,
        biNumber: client.biNumber,
        phone: client.phone,
        nuit: client.nuit,
        monthlyIncome: client.monthlyIncome,
        monthlyExpenses: client.monthlyExpenses,
        employer: client.employer,
        province: client.province,
        district: client.district,
      },
      product: { name: product.name },
      requestedAmount: selectedApp.requestedAmount,
      termMonths: selectedApp.termMonths,
      interestRate: selectedApp.interestRate,
      creditScore: selectedApp.creditScore || 0,
      riskLevel: selectedApp.riskLevel || 'medium',
      dti: selectedApp.dti || 0,
      paymentCapacity: selectedApp.paymentCapacity || 0,
      monthlyPayment,
      totalInterest,
      totalAmount,
      documents: documents.map((d) => ({
      name: DOCUMENT_LABELS[d.documentType] || d.documentType,
      verified: d.reviewStatus === 'valid',
      rejectedReason: d.reviewNotes,
      })),
      purpose: selectedApp.purpose,
      guaranteeType: selectedApp.guaranteeType,
      guaranteeDescription: selectedApp.guaranteeDescription,
      decision:
        selectedApp.status === 'approved'
          ? 'approved'
          : selectedApp.status === 'rejected'
          ? 'rejected'
          : undefined,
      decisionNotes: selectedApp.rejectionReason || selectedApp.approvalConditions,
    };

    generateParecerPDF(parecerData);

    toast({
      title: 'Parecer exportado em PDF',
      description: 'Documento institucional descarregado com sucesso.',
    });
  };

  const client = selectedApp ? getClient(selectedApp.clientId) : null;
  const product = selectedApp ? getProduct(selectedApp.productId) : null;

  const totalDocs = documents.length;
  const docsViewed = documents.filter((d) => d.isViewed).length;
  const docsValid = documents.filter((d) => d.reviewStatus === 'valid').length;
  const progress = totalDocs > 0 ? Math.round((docsViewed / totalDocs) * 100) : 0;

  if (loading) {
    return <div className="p-6">A carregar solicitações em análise...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Análise de Crédito</h1>
          <p className="text-muted-foreground">
            {applications.length} solicitações aguardando análise
          </p>
        </div>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por cliente ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Riscos</SelectItem>
                <SelectItem value="high">Alto Risco</SelectItem>
                <SelectItem value="medium">Médio Risco</SelectItem>
                <SelectItem value="low">Baixo Risco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((app, i) => {
          const appClient = getClient(app.clientId);
          const appProduct = getProduct(app.productId);

          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="card-elevated cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => void handleStartAnalysis(app)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getRiskBadge(app.riskLevel)}
                      {getStatusBadge(app.status)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <h3 className="font-semibold mb-1">{appClient?.fullName || 'Cliente'}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {appProduct?.name || 'Produto'}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {calcService.formatCurrency(app.requestedAmount)}
                    </span>
                    <span className="text-muted-foreground">{app.termMonths} meses</span>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>Score: {app.creditScore ?? '-'}</span>
                    <span>DTI: {app.dti ?? '-'}%</span>
                  </div>

                  {processingId === app.id && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      A processar...
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma solicitação pendente</h3>
            <p className="text-muted-foreground">Todas as solicitações foram analisadas</p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isAnalyzing}
        onOpenChange={(open) => {
          setIsAnalyzing(open);
          if (!open) {
            setDocuments([]);
            setDocumentNotes({});
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise de Solicitação</DialogTitle>
            <DialogDescription>
              {client?.fullName} • {product?.name || 'Produto'}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && client && (
            <Tabs defaultValue="client" className="mt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="client">Cliente</TabsTrigger>
                <TabsTrigger value="loan">Empréstimo</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="analysis">Análise</TabsTrigger>
              </TabsList>

              <TabsContent value="client" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome Completo</Label>
                    <p className="font-medium">{client.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">BI</Label>
                    <p className="font-medium">{client.biNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone</Label>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Localização</Label>
                    <p className="font-medium">
                      {client.district}, {client.province}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Ocupação</Label>
                    <p className="font-medium">{client.occupation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Empregador</Label>
                    <p className="font-medium">{client.employer || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Rendimento Mensal</Label>
                    <p className="font-medium text-success">
                      {calcService.formatCurrency(client.monthlyIncome)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Despesas Mensais</Label>
                    <p className="font-medium text-destructive">
                      {calcService.formatCurrency(client.monthlyExpenses)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground text-xs">Referências</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{client.reference1.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.reference1.relationship} • {client.reference1.phone}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{client.reference2.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.reference2.relationship} • {client.reference2.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="loan" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Produto</Label>
                    <p className="font-medium">{product?.name || 'Produto'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Valor Solicitado</Label>
                    <p className="font-medium">
                      {calcService.formatCurrency(selectedApp.requestedAmount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Prazo</Label>
                    <p className="font-medium">{selectedApp.termMonths} meses</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Taxa de Juros</Label>
                    <p className="font-medium">{selectedApp.interestRate}% ao mês</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Finalidade</Label>
                    <p className="font-medium">{selectedApp.purpose}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Garantia</Label>
                    <p className="font-medium">{selectedApp.guaranteeType}</p>
                  </div>
                  {selectedApp.guarantorName && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">Fiador</Label>
                        <p className="font-medium">{selectedApp.guarantorName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Telefone do Fiador
                        </Label>
                        <p className="font-medium">{selectedApp.guarantorPhone}</p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{totalDocs}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">{docsViewed}</p>
                    <p className="text-xs text-muted-foreground">Vistos</p>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-success">{docsValid}</p>
                    <p className="text-xs text-muted-foreground">Válidos</p>
                  </div>
                  <div className="p-3 bg-warning/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-warning">
                      {documents.filter((d) => d.reviewStatus === 'pending').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visualização</span>
                  <span className="text-sm font-medium">
                    {docsViewed}/{totalDocs} vistos
                  </span>
                </div>

                <Progress value={progress} className="h-2" />

                {loadingDocuments ? (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    A carregar documentos...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-sm text-warning font-medium">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Nenhum documento anexado a esta solicitação.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-medium">{DOCUMENT_LABELS[doc.documentType] || doc.documentType}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {doc.originalName}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">
                                  {doc.isViewed ? 'Visto' : 'Não visto'}
                                </Badge>
                                <Badge
                                  className={cn(
                                    doc.reviewStatus === 'valid' && 'bg-success/15 text-success',
                                    doc.reviewStatus === 'invalid' && 'bg-destructive/15 text-destructive',
                                    doc.reviewStatus === 'pending' && 'bg-warning/15 text-warning'
                                  )}
                                >
                                  {doc.reviewStatus === 'valid'
                                    ? 'Válido'
                                    : doc.reviewStatus === 'invalid'
                                    ? 'Inválido'
                                    : 'Pendente'}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleViewDocument(doc)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDownloadDocument(doc)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Observações do Analista
                            </Label>
                            <Textarea
                              value={documentNotes[doc.id] || ''}
                              onChange={(e) =>
                                setDocumentNotes((prev) => ({
                                  ...prev,
                                  [doc.id]: e.target.value,
                                }))
                              }
                              placeholder="Observações sobre a autenticidade, legibilidade ou validade do documento..."
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => void handleReviewDocument(doc, 'valid')}
                              disabled={doc.reviewStatus === 'valid'}
                              variant={doc.reviewStatus === 'valid' ? 'secondary' : 'default'}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {doc.reviewStatus === 'valid' ? 'Validado' : 'Validar'}
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleReviewDocument(doc, 'invalid')}
                              disabled={doc.reviewStatus === 'invalid'}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {doc.reviewStatus === 'invalid' ? 'Invalidado' : 'Invalidar'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {documents.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Para aprovar a solicitação, os documentos obrigatórios devem estar
                      carregados e validados.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <Card
                  className={cn(
                    'border-2',
                    selectedApp.riskLevel === 'low' && 'border-success/50 bg-success/5',
                    selectedApp.riskLevel === 'medium' && 'border-warning/50 bg-warning/5',
                    selectedApp.riskLevel === 'high' && 'border-destructive/50 bg-destructive/5'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Score de Crédito</p>
                        <p className="text-2xl font-bold">{selectedApp.creditScore ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nível de Risco</p>
                        {getRiskBadge(selectedApp.riskLevel)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">DTI</p>
                        <p className="text-xl font-medium">{selectedApp.dti ?? '-'}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Capacidade de Pagamento</p>
                        <p className="text-xl font-medium">
                          {calcService.formatCurrency(selectedApp.paymentCapacity || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={handleExportDecision}>
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar Parecer
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setIsAnalyzing(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDecision('reject');
                setIsDeciding(true);
              }}
              disabled={processingId === selectedApp?.id}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={() => {
                setDecision('approve');
                setIsDeciding(true);
              }}
              disabled={processingId === selectedApp?.id}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeciding} onOpenChange={setIsDeciding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {client?.fullName} - {calcService.formatCurrency(selectedApp?.requestedAmount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {decision === 'approve' ? (
              <>
                <div>
                  <Label>Valor Aprovado (MZN)</Label>
                  <Input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicitado: {calcService.formatCurrency(selectedApp?.requestedAmount || 0)}
                  </p>
                </div>

                <div>
                  <Label>Condições de Aprovação</Label>
                  <Textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="Condições especiais, se houver..."
                  />
                </div>

                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-sm text-success">
                    ✓ A aplicação será marcada como aprovada
                  </p>
                </div>
              </>
            ) : (
              <div>
                <Label>Motivo da Rejeição *</Label>
                <Textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeciding(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDecision}
              variant={decision === 'approve' ? 'default' : 'destructive'}
              disabled={processingId === selectedApp?.id}
            >
              {decision === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}