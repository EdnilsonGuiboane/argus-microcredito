import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { applicationService } from '@/services/applications/applicationService';
import { clientService } from '@/services/clients/clientService';
import { productService } from '@/services/products/productService';
import { calcService } from '@/services/calcService';
import {
  LoanApplication,
  Client,
  ApplicationStatus,
  LoanProduct,
} from '@/models/types';
import { ApplicationWizard } from '@/components/applications/ApplicationWizard';
import { cn } from '@/lib/utils';

const statusConfig: Record<ApplicationStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Submetida', color: 'bg-info/15 text-info' },
  under_review: { label: 'Em Análise', color: 'bg-primary/15 text-primary' },
  pending_documents: { label: 'Docs Pendentes', color: 'bg-warning/15 text-warning' },
  approved: { label: 'Aprovada', color: 'bg-success/15 text-success' },
  rejected: { label: 'Rejeitada', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground' },
};

export default function Solicitacoes() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const columns: ApplicationStatus[] = [
    'draft',
    'submitted',
    'under_review',
    'pending_documents',
    'approved',
    'rejected',
  ];

  async function loadAll() {
    try {
      setLoading(true);

      const [apps, cls, prods] = await Promise.all([
        applicationService.list(),
        clientService.list(),
        productService.list(),
      ]);

      setApplications(apps);
      setClients(cls);
      setProducts(prods);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const grouped = useMemo(() => {
    const result: Record<ApplicationStatus, LoanApplication[]> = {
      draft: [],
      submitted: [],
      under_review: [],
      pending_documents: [],
      approved: [],
      rejected: [],
      cancelled: [],
    };

    columns.forEach((status) => {
      result[status] = [];
    });

    applications.forEach((app) => {
      if (columns.includes(app.status)) {
        result[app.status].push(app);
      }
    });

    return result;
  }, [applications]);

  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getProduct = (id: string) => products.find((p) => p.id === id);

  const getRiskBadge = (risk?: string) => {
    const config = {
      low: { label: 'Baixo', class: 'bg-success/15 text-success' },
      medium: { label: 'Médio', class: 'bg-warning/15 text-warning' },
      high: { label: 'Alto', class: 'bg-destructive/15 text-destructive' },
    };

    const c = config[risk as keyof typeof config] || config.medium;
    return <span className={cn('status-badge text-xs', c.class)}>{c.label}</span>;
  };

  const handleCardClick = (app: LoanApplication) => {
    if (['submitted', 'under_review', 'pending_documents'].includes(app.status)) {
      navigate('/analise');
    } else {
      setSelectedApp(app);
      setIsDetailOpen(true);
    }
  };

  async function handleSubmitApplication(applicationId: string) {
    try {
      setSubmittingId(applicationId);
      await applicationService.submitApplication(applicationId);
      await loadAll();
    } catch (error) {
      console.error('Erro ao submeter:', error);
    } finally {
      setSubmittingId(null);
    }
  }

  const selectedClient = selectedApp ? getClient(selectedApp.clientId) : null;
  const selectedProduct = selectedApp ? getProduct(selectedApp.productId) : null;

  if (loading) {
    return <div className="p-6">A carregar solicitações...</div>;
  }

  return (
      <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Solicitações</h1>
          <p className="text-sm text-muted-foreground">Pipeline de pedidos de crédito</p>
        </div>

        <Button onClick={() => setIsWizardOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5">
        {columns.map((status) => (
          <Card key={status} className="card-elevated flex-shrink-0 min-w-[120px] sm:min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <span className={cn('status-badge text-[10px] sm:text-xs', statusConfig[status].color)}>{statusConfig[status].label}</span>
                <span className="text-xl sm:text-2xl font-bold">{grouped[status].length}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {columns.map((status) => (
          <div key={status} className="flex-shrink-0 w-[260px] sm:w-72">
            <div className="flex items-center gap-2 mb-3">
             <span className={cn('status-badge text-[10px] sm:text-xs', statusConfig[status].color)}>{statusConfig[status].label}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{grouped[status].length}</span>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {grouped[status].slice(0, 8).map((app, i) => {
                const client = getClient(app.clientId);
                const product = getProduct(app.productId);

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="card-elevated cursor-pointer hover:shadow-card-hover transition-shadow"
                      onClick={() => handleCardClick(app)}
                    >
                       <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-medium truncate">
                              {client?.fullName || 'Cliente'}
                            </p>

                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {calcService.formatCurrency(app.requestedAmount)}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {app.termMonths} meses
                              </p>
                              {app.riskLevel && getRiskBadge(app.riskLevel)}
                            </div>

                            {product?.name && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                {product.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {app.status === 'draft' && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              disabled={submittingId === app.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleSubmitApplication(app.id);
                              }}
                            >
                              {submittingId === app.id ? 'A submeter...' : 'Submeter'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {grouped[status].length === 0 && (
                <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">Nenhuma solicitação</div>
                 
              )}

              {grouped[status].length > 8 && (
                <Button variant="ghost" className="w-full text-xs sm:text-sm">
                  Ver mais {grouped[status].length - 8}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ApplicationWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          void loadAll();
        }}
      />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl mx-3 sm:mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitação #{selectedApp?.id.slice(-6)}</DialogTitle>
            <DialogDescription>
              {selectedClient?.fullName} •{' '}
              {statusConfig[selectedApp?.status || 'draft'].label}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedClient?.fullName}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="font-medium">{selectedProduct?.name}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Valor Solicitado</p>
                  <p className="font-medium">
                    {calcService.formatCurrency(selectedApp.requestedAmount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Valor Aprovado</p>
                  <p className="font-medium">
                    {selectedApp.approvedAmount
                      ? calcService.formatCurrency(selectedApp.approvedAmount)
                      : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Prazo</p>
                  <p className="font-medium">{selectedApp.termMonths} meses</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Juros</p>
                  <p className="font-medium">{selectedApp.interestRate}% ao mês</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Finalidade</p>
                  <p className="font-medium">{selectedApp.purpose}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Risco</p>
                  {getRiskBadge(selectedApp.riskLevel)}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="w-4 h-4" />
                  Os documentos desta solicitação são tratados no módulo de análise.
                </div>
              </div>

              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm font-medium text-destructive">
                    Motivo da Rejeição:
                  </p>
                  <p className="text-sm">{selectedApp.rejectionReason}</p>
                </div>
              )}

              {selectedApp.status === 'approved' && selectedApp.approvalConditions && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-sm font-medium text-success">
                    Condições de Aprovação:
                  </p>
                  <p className="text-sm">{selectedApp.approvalConditions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}