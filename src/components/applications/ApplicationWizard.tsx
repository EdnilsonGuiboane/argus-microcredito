import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  File,
} from 'lucide-react';
import { calcService } from '@/services/calcService';
import { auditService } from '@/services/auditService';
import { applicationService } from '@/services/applications/applicationService';
import { clientService } from '@/services/clients/clientService';
import { productService } from '@/services/products/productService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Client,
  LoanProduct,
  LoanApplication,
  GUARANTEE_TYPES,
  LOAN_PURPOSES,
} from '@/models/types';
import { cn } from '@/lib/utils';
import { applicationDocumentService } from '@/services/documents/applicationDocumentService';

interface ApplicationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedClient?: Client;
}

type WizardDocumentItem = {
  id: string;
  name: string;
  documentType: string;
  required: boolean;
  uploaded: boolean;
  file?: File;
  fileName?: string;
  fileSize?: number;
};

const REQUIRED_DOCUMENTS: WizardDocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Bilhete de Identidade',
    documentType: 'bi_copy',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-2',
    name: 'Comprovativo de Residência',
    documentType: 'proof_of_address',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-3',
    name: 'Comprovativo de Rendimento',
    documentType: 'proof_of_income',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-4',
    name: 'Extracto Bancário (3 meses)',
    documentType: 'bank_statement',
    required: false,
    uploaded: false,
  },
  {
    id: 'doc-5',
    name: 'Declaração do Empregador',
    documentType: 'employer_statement',
    required: false,
    uploaded: false,
  },
];

const steps = [
  { id: 1, title: 'Cliente', icon: User },
  { id: 2, title: 'Condições', icon: FileText },
  { id: 3, title: 'Documentos', icon: Upload },
  { id: 4, title: 'Análise', icon: Calculator },
  { id: 5, title: 'Resumo', icon: CheckCircle2 },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplicationWizard({
  open,
  onOpenChange,
  onSuccess,
  preselectedClient,
}: ApplicationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState(preselectedClient?.id || '');
  const [clientSearch, setClientSearch] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [purpose, setPurpose] = useState('');
  const [guaranteeType, setGuaranteeType] = useState('');
  const [guaranteeDescription, setGuaranteeDescription] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');

  const [documents, setDocuments] = useState<WizardDocumentItem[]>(REQUIRED_DOCUMENTS);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);

  async function loadData() {
    try {
      setLoadingData(true);

      const [cls, prods] = await Promise.all([
        clientService.list(),
        productService.list(),
      ]);

      setClients(cls.filter((c) => c.status === 'active'));
      setProducts(prods.filter((p) => p.isActive));
    } catch (error) {
      console.error('Erro ao carregar dados do wizard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar clientes e produtos.',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setCurrentStep(1);
    setSelectedClientId(preselectedClient?.id || '');
    setClientSearch('');
    setSelectedProductId('');
    setAmount('');
    setTermMonths('');
    setPurpose('');
    setGuaranteeType('');
    setGuaranteeDescription('');
    setGuarantorName('');
    setGuarantorPhone('');
    setUploadingDocId(null);
    setDocuments(REQUIRED_DOCUMENTS.map((d) => ({ ...d })));
  }, [open, preselectedClient]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10);

    const q = clientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.biNumber.toLowerCase().includes(q) ||
          c.phone.includes(q)
      )
      .slice(0, 10);
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const analysis = useMemo(() => {
    if (!selectedClient || !amount || !termMonths) return null;

    const loanAmount = parseFloat(amount);
    const term = parseInt(termMonths);
    const monthlyRate = (selectedProduct?.defaultInterestRate || 5) / 100;

    const monthlyPayment = calcService.calculateMonthlyPayment(
      loanAmount,
      monthlyRate,
      term
    );

    const paymentCapacity = calcService.calculatePaymentCapacity(
      selectedClient.monthlyIncome,
      selectedClient.monthlyExpenses
    );

    const dti = calcService.calculateDTI(
      monthlyPayment + selectedClient.monthlyExpenses,
      selectedClient.monthlyIncome
    );

    const hasGuarantor = !!guarantorName;
    const hasCollateral =
      guaranteeType !== 'Sem garantia' && guaranteeType !== '';

    const creditScore = calcService.calculateCreditScore(
      dti,
      paymentCapacity,
      monthlyPayment,
      hasGuarantor,
      hasCollateral
    );

    const riskLevel = calcService.getRiskLevel(creditScore);

    return {
      monthlyPayment,
      paymentCapacity,
      dti,
      creditScore,
      riskLevel,
      adminFee: loanAmount * ((selectedProduct?.adminFeeRate || 3) / 100),
      netDisbursement:
        loanAmount - loanAmount * ((selectedProduct?.adminFeeRate || 3) / 100),
      totalInterest: monthlyPayment * term - loanAmount,
      totalAmount: monthlyPayment * term,
    };
  }, [
    selectedClient,
    selectedProduct,
    amount,
    termMonths,
    guarantorName,
    guaranteeType,
  ]);

  const requiredDocsUploaded = documents.filter(
    (d) => d.required && d.uploaded
  ).length;

  const requiredDocsTotal = documents.filter((d) => d.required).length;
  const allRequiredUploaded = requiredDocsUploaded === requiredDocsTotal;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedClientId;
      case 2:
        return !!selectedProductId && !!amount && !!termMonths && !!purpose;
      case 3:
        return allRequiredUploaded;
      case 4:
        return !!analysis;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileSelect = (docId: string) => {
    setUploadingDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocId) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (file.size > maxSize) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'Tamanho máximo: 10 MB',
        variant: 'destructive',
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo inválido',
        description: 'Formatos aceites: PDF, JPG, PNG, WebP',
        variant: 'destructive',
      });
      return;
    }

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === uploadingDocId
          ? {
              ...d,
              uploaded: true,
              file,
              fileName: file.name,
              fileSize: file.size,
            }
          : d
      )
    );

    toast({
      title: 'Documento carregado',
      description: `${file.name} anexado com sucesso`,
    });

    setUploadingDocId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              uploaded: false,
              file: undefined,
              fileName: undefined,
              fileSize: undefined,
            }
          : d
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedProduct || !analysis) return;

    setLoading(true);

    try {
      const createdApplication = await applicationService.create({
        tenantId: selectedClient.tenantId,
        clientId: selectedClient.id,
        productId: selectedProduct.id,
        requestedAmount: parseFloat(amount),
        termMonths: parseInt(termMonths),
        interestRate: selectedProduct.defaultInterestRate,
        adminFee: analysis.adminFee,
        purpose,
        guaranteeType,
        guaranteeDescription: guaranteeDescription || undefined,
        guarantorName: guarantorName || undefined,
        guarantorPhone: guarantorPhone || undefined,
        dti: analysis.dti,
        paymentCapacity: analysis.paymentCapacity,
        riskLevel: analysis.riskLevel,
        creditScore: analysis.creditScore,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        reviewedAt: undefined,
        reviewedBy: undefined,
        rejectionReason: undefined,
        approvalConditions: undefined,
        approvedAmount: undefined,
        assignedAnalyst: undefined,
        createdBy: user?.id,
      });

      const uploadedDocuments = documents.filter((d) => d.uploaded && d.file);

      for (const doc of uploadedDocuments) {
        await applicationDocumentService.upload({
          tenantId: selectedClient.tenantId,
          applicationId: createdApplication.id,
          clientId: selectedClient.id,
          documentType: doc.documentType,
          file: doc.file as File,
          uploadedBy: user?.id,
        });
      }

      auditService.log(
        user?.id || '',
        user?.fullName || '',
        'CRIAR_SOLICITACAO',
        'application',
        createdApplication.id,
        `${calcService.formatCurrency(parseFloat(amount))} - ${selectedProduct.name}`
      );

      toast({
        title: 'Solicitação Criada',
        description: `Solicitação #${createdApplication.id.slice(-6)} foi submetida para análise`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Falha ao criar solicitação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const config = {
      low: { label: 'Baixo', class: 'bg-success/15 text-success' },
      medium: { label: 'Médio', class: 'bg-warning/15 text-warning' },
      high: { label: 'Alto', class: 'bg-destructive/15 text-destructive' },
    };

    const c = config[risk as keyof typeof config] || config.medium;
    return <span className={cn('status-badge', c.class)}>{c.label}</span>;
  };

  if (loadingData) {
    return <div className="p-6">A carregar dados...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Crédito</DialogTitle>
          <DialogDescription>
            Passo {currentStep} de 5 - {steps[currentStep - 1].title}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-4">
          <Progress value={(currentStep / 5) * 100} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Pesquisar Cliente</Label>
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Nome, BI ou telefone..."
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredClients.map((client) => (
                  <Card
                    key={client.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedClientId === client.id
                        ? 'border-primary ring-1 ring-primary'
                        : 'hover:border-muted-foreground/50'
                    )}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{client.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          BI: {client.biNumber} • {client.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {calcService.formatCurrency(client.monthlyIncome)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rendimento
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredClients.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produto *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.defaultInterestRate}% a.m.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Finalidade *</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LOAN_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor Solicitado (MZN) *</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mín: {calcService.formatCurrency(selectedProduct.minAmount)} -
                      Máx: {calcService.formatCurrency(selectedProduct.maxAmount)}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Prazo (Meses) *</Label>
                  <Input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    placeholder="6"
                  />
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mín: {selectedProduct.minTermMonths} - Máx:{' '}
                      {selectedProduct.maxTermMonths} meses
                    </p>
                  )}
                </div>

                <div>
                  <Label>Tipo de Garantia</Label>
                  <Select value={guaranteeType} onValueChange={setGuaranteeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_TYPES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Descrição da Garantia</Label>
                  <Input
                    value={guaranteeDescription}
                    onChange={(e) => setGuaranteeDescription(e.target.value)}
                    placeholder="Detalhes da garantia..."
                  />
                </div>

                {guaranteeType === 'Fiador' && (
                  <>
                    <div>
                      <Label>Nome do Fiador</Label>
                      <Input
                        value={guarantorName}
                        onChange={(e) => setGuarantorName(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label>Telefone do Fiador</Label>
                      <Input
                        value={guarantorPhone}
                        onChange={(e) => setGuarantorPhone(e.target.value)}
                        placeholder="+258 84 000 0000"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Carregue os documentos do cliente. Documentos marcados com{' '}
                  <span className="text-destructive font-medium">*</span> são
                  obrigatórios. Formatos aceites: PDF, JPG, PNG, WebP (máx. 10 MB).
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Obrigatórios carregados
                </span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    allRequiredUploaded ? 'text-success' : 'text-warning'
                  )}
                >
                  {requiredDocsUploaded}/{requiredDocsTotal}
                </span>
              </div>

              <Progress
                value={(requiredDocsUploaded / requiredDocsTotal) * 100}
                className="h-2"
              />

              <div className="space-y-3 mt-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      doc.uploaded
                        ? 'bg-success/5 border-success/30'
                        : 'bg-muted/50 border-border'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {doc.uploaded ? (
                        <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <File className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {doc.name}
                          {doc.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </p>

                        {doc.uploaded && doc.fileName ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.fileName} • {formatFileSize(doc.fileSize || 0)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Nenhum ficheiro carregado
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.uploaded ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileSelect(doc.id)}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Carregar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!allRequiredUploaded && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Carregue todos os documentos obrigatórios para avançar.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && analysis && (
            <div className="space-y-4">
              <Card
                className={cn(
                  'border-2',
                  analysis.riskLevel === 'low' &&
                    'border-success/50 bg-success/5',
                  analysis.riskLevel === 'medium' &&
                    'border-warning/50 bg-warning/5',
                  analysis.riskLevel === 'high' &&
                    'border-destructive/50 bg-destructive/5'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {analysis.riskLevel === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Calculator className="w-5 h-5 text-primary" />
                      )}
                      <span className="font-semibold">Resultado da Análise</span>
                    </div>
                    {getRiskBadge(analysis.riskLevel)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Score de Crédito
                      </p>
                      <p className="text-2xl font-bold">{analysis.creditScore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Nível de Risco
                      </p>
                      <p className="text-2xl font-bold capitalize">
                        {analysis.riskLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        DTI (Endividamento)
                      </p>
                      <p className="text-lg font-medium">
                        {analysis.dti.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Capacidade de Pagamento
                      </p>
                      <p className="text-lg font-medium">
                        {calcService.formatCurrency(analysis.paymentCapacity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Prestação Mensal
                    </p>
                    <p className="text-xl font-bold">
                      {calcService.formatCurrency(analysis.monthlyPayment)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-xl font-bold">
                      {calcService.formatCurrency(analysis.totalAmount)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {analysis.riskLevel === 'high' && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Risco elevado detectado. A solicitação poderá exigir condições
                    especiais ou ser rejeitada pelo analista.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && selectedClient && selectedProduct && analysis && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">Resumo da Solicitação</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedClient.fullName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produto</p>
                      <p className="font-medium">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Solicitado</p>
                      <p className="font-medium">
                        {calcService.formatCurrency(parseFloat(amount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prazo</p>
                      <p className="font-medium">{termMonths} meses</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxa de Juros</p>
                      <p className="font-medium">
                        {selectedProduct.defaultInterestRate}% ao mês
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxa Administrativa</p>
                      <p className="font-medium">
                        {calcService.formatCurrency(analysis.adminFee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prestação Mensal</p>
                      <p className="font-medium">
                        {calcService.formatCurrency(analysis.monthlyPayment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Líquido</p>
                      <p className="font-medium text-success">
                        {calcService.formatCurrency(analysis.netDisbursement)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Finalidade</p>
                      <p className="font-medium">{purpose}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Garantia</p>
                      <p className="font-medium">
                        {guaranteeType || 'Sem garantia'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risco</p>
                      {getRiskBadge(analysis.riskLevel)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">{analysis.creditScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">Documentos Anexados</h4>
                  <div className="space-y-2">
                    {documents
                      .filter((d) => d.uploaded && d.fileName)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          <span>{doc.name}</span>
                          <span className="text-muted-foreground">
                            — {doc.fileName}
                          </span>
                        </div>
                      ))}

                    {documents.filter((d) => !d.uploaded && !d.required).length >
                      0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {
                          documents.filter((d) => !d.uploaded && !d.required)
                            .length
                        }{' '}
                        documento(s) opcional(is) não carregado(s)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm">
                  ✓ Ao submeter, a solicitação será enviada para análise pelo
                  departamento de crédito.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} disabled={loading || !canProceed()}>
              {loading ? 'A submeter...' : 'Submeter Solicitação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}