import { useState, useEffect } from 'react';
import {
  Settings,
  Package,
  Users,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  MessageSquare,
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
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { storageService } from '@/services/storageService';
import { calcService } from '@/services/calcService';
import { auditService } from '@/services/auditService';
import { initializeMockData } from '@/services/mockService';
import { productService } from '@/services/products/productService';
import { userService, type UserListItem } from '@/services/users/userService';
import { LoanProduct, UserRole } from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  messagingService,
  MessagingSettings,
  MessageTemplate,
} from '@/services/messagingService';
import {
  messagingConfigService,
  type MessagingSettingsDb,
  type MessageTemplateDb,
} from '@/services/messaging/messagingConfigService';

export default function Configuracoes() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);



  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    minAmount: '',
    maxAmount: '',
    minTermMonths: '',
    maxTermMonths: '',
    defaultInterestRate: '',
    adminFeeRate: '',
    latePenaltyRate: '',
    gracePeriodDays: '',
    isActive: true,
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'analyst' as UserRole,
    isActive: true,
  });

  const [msgSettings, setMsgSettings] = useState<MessagingSettingsDb | null>(null);
  const [msgTemplates, setMsgTemplates] = useState<MessageTemplateDb[]>([]);

  const [reminderDaysInput, setReminderDaysInput] = useState('');
  const [lateDaysInput, setLateDaysInput] = useState('');

  const [loadingMessaging, setLoadingMessaging] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null
  );
  const [editingTemplateBody, setEditingTemplateBody] = useState('');

  useEffect(() => {
    void loadProducts();
    void loadUsers();
    void loadMessagingConfig();
  }, []);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      const data = await productService.list();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const data = await userService.list();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os utilizadores.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadMessagingConfig() {
  try {
    setLoadingMessaging(true);

   

    const tenantId =
      currentUser?.tenantId || '11111111-1111-1111-1111-111111111111';

    const [settings, templates] = await Promise.all([
      messagingConfigService.getSettings(tenantId),
      messagingConfigService.listTemplates(tenantId),
    ]);
    
    

    setMsgSettings(
      settings ?? {
        id: '',
        tenantId,
        defaultChannel: 'whatsapp',
        allowedHoursStart: '08:00',
        allowedHoursEnd: '17:00',
        reminderDaysBefore: [3, 1, 0],
        lateDaysAfter: [1, 3, 7, 14, 30],
        createdAt: '',
        updatedAt: '',
      }
    );

    setMsgTemplates(templates);
    
    setReminderDaysInput(settings?.reminderDaysBefore.join(', ') || '');
    setLateDaysInput(settings?.lateDaysAfter.join(', ') || '');
  } catch (error) {
    console.error('Erro ao carregar comunicação:', error);
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar as configurações de comunicação.',
      variant: 'destructive',
    });
  } finally {
    setLoadingMessaging(false);
  }
}


  const getRoleBadge = (role: UserRole) => {
    const config = {
      admin: { label: 'Administrador', class: 'bg-primary/15 text-primary' },
      analyst: { label: 'Analista', class: 'bg-info/15 text-info' },
      cashier: { label: 'Caixa', class: 'bg-success/15 text-success' },
    };
    const c = config[role];
    return <span className={cn('status-badge', c.class)}>{c.label}</span>;
  };

  const handleEditProduct = (product: LoanProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      minAmount: String(product.minAmount),
      maxAmount: String(product.maxAmount),
      minTermMonths: String(product.minTermMonths),
      maxTermMonths: String(product.maxTermMonths),
      defaultInterestRate: String(product.defaultInterestRate),
      adminFeeRate: String(product.adminFeeRate),
      latePenaltyRate: String(product.latePenaltyRate),
      gracePeriodDays: String(product.gracePeriodDays),
      isActive: product.isActive,
    });
    setIsProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      minAmount: '',
      maxAmount: '',
      minTermMonths: '',
      maxTermMonths: '',
      defaultInterestRate: '',
      adminFeeRate: '',
      latePenaltyRate: '',
      gracePeriodDays: '',
      isActive: true,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      const payload = {
        tenant_id:
          currentUser?.tenantId || '11111111-1111-1111-1111-111111111111',
        name: productForm.name,
        description: productForm.description || null,
        min_amount: parseFloat(productForm.minAmount) || 0,
        max_amount: parseFloat(productForm.maxAmount) || 0,
        min_term_months: parseInt(productForm.minTermMonths) || 1,
        max_term_months: parseInt(productForm.maxTermMonths) || 12,
        default_interest_rate:
          parseFloat(productForm.defaultInterestRate) || 0,
        admin_fee_rate: parseFloat(productForm.adminFeeRate) || 0,
        late_penalty_rate: parseFloat(productForm.latePenaltyRate) || 0,
        grace_period_days: parseInt(productForm.gracePeriodDays) || 0,
        is_active: productForm.isActive,
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, payload);

        auditService.log(
          currentUser?.id || '',
          currentUser?.fullName || '',
          'ACTUALIZAR_PRODUTO',
          'loanProduct',
          editingProduct.id,
          editingProduct.name
        );
      } else {
        const created = await productService.create(payload);

        auditService.log(
          currentUser?.id || '',
          currentUser?.fullName || '',
          'CRIAR_PRODUTO',
          'loanProduct',
          created.id,
          created.name
        );
      }

      toast({
        title: editingProduct ? 'Produto Actualizado' : 'Produto Criado',
        description: `${productForm.name} foi ${
          editingProduct ? 'actualizado' : 'criado'
        } com sucesso`,
      });

      setIsProductModalOpen(false);
      await loadProducts();
    } catch (error) {
      console.error('Erro ao guardar produto:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível guardar o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (product: LoanProduct) => {
    try {
      await productService.delete(product.id);

      auditService.log(
        currentUser?.id || '',
        currentUser?.fullName || '',
        'ELIMINAR_PRODUTO',
        'loanProduct',
        product.id,
        product.name
      );

      toast({
        title: 'Produto Eliminado',
        description: `${product.name} foi eliminado com sucesso.`,
        variant: 'destructive',
      });

      await loadProducts();
    } catch (error) {
      console.error('Erro ao eliminar produto:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível eliminar o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user: UserListItem) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.roles[0] || 'analyst',
      isActive: user.isActive,
    });
    setIsUserModalOpen(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setUserForm({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'analyst',
      isActive: true,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await userService.updateProfile(editingUser.id, {
          full_name: userForm.fullName,
          email: userForm.email,
          phone: userForm.phone || null,
          is_active: userForm.isActive,
        });

        await userService.setPrimaryRole(
          editingUser.id,
          editingUser.tenantId,
          userForm.role
        );

        auditService.log(
          currentUser?.id || '',
          currentUser?.fullName || '',
          'ACTUALIZAR_UTILIZADOR',
          'user',
          editingUser.id,
          editingUser.fullName
        );

        toast({
          title: 'Utilizador actualizado',
          description: `${userForm.fullName} foi actualizado com sucesso.`,
        });
      } else {
        await userService.createViaAdminFunction({
          tenantId:
            currentUser?.tenantId || '11111111-1111-1111-1111-111111111111',
          fullName: userForm.fullName,
          email: userForm.email,
          password: userForm.password,
          phone: userForm.phone || undefined,
          role: userForm.role,
          createdBy: currentUser?.id,
        });

        auditService.log(
          currentUser?.id || '',
          currentUser?.fullName || '',
          'CRIAR_UTILIZADOR',
          'user',
          '',
          userForm.fullName
        );

        toast({
          title: 'Utilizador criado',
          description: `${userForm.fullName} foi criado com sucesso.`,
        });
      }

      setIsUserModalOpen(false);
      await loadUsers();
    } catch (error) {
      console.error('Erro ao guardar utilizador:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível guardar o utilizador.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserActive = async (user: UserListItem) => {
    try {
      await userService.setActive(user.id, !user.isActive);

      auditService.log(
        currentUser?.id || '',
        currentUser?.fullName || '',
        user.isActive ? 'DESACTIVAR_UTILIZADOR' : 'ACTIVAR_UTILIZADOR',
        'user',
        user.id,
        user.fullName
      );

      toast({
        title: user.isActive
          ? 'Utilizador desactivado'
          : 'Utilizador activado',
        description: user.fullName,
      });

      await loadUsers();
    } catch (error) {
      console.error('Erro ao alterar estado do utilizador:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível actualizar o utilizador.',
        variant: 'destructive',
      });
    }
  };

  const handleResetData = () => {
    storageService.reset();
    initializeMockData();
    auditService.log(
      currentUser?.id || '',
      currentUser?.fullName || '',
      'RESETAR_DADOS',
      'system',
      'all'
    );
    toast({
      title: 'Dados Resetados',
      description: 'Todos os dados foram reinicializados',
      variant: 'destructive',
    });
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gestão de produtos, utilizadores e sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comunicação
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Produtos de Empréstimo</CardTitle>
                <CardDescription>
                  Configure os tipos de crédito disponíveis
                </CardDescription>
              </div>
              <Button onClick={handleNewProduct}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="py-8 text-center text-muted-foreground">
                  A carregar produtos...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor (Min-Max)</TableHead>
                      <TableHead>Prazo (Min-Max)</TableHead>
                      <TableHead>Taxa Juros</TableHead>
                      <TableHead>Taxa Admin</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {calcService.formatCurrency(product.minAmount)} -{' '}
                          {calcService.formatCurrency(product.maxAmount)}
                        </TableCell>
                        <TableCell>
                          {product.minTermMonths} - {product.maxTermMonths} meses
                        </TableCell>
                        <TableCell>{product.defaultInterestRate}%</TableCell>
                        <TableCell>{product.adminFeeRate}%</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'status-badge',
                              product.isActive
                                ? 'bg-success/15 text-success'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Eliminar Produto?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acção não pode ser revertida. O produto "
                                    {product.name}" será eliminado permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDeleteProduct(product)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Utilizadores</CardTitle>
                <CardDescription>
                  Gestão de contas e permissões
                </CardDescription>
              </div>
              <Button onClick={handleNewUser}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Utilizador
              </Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="py-8 text-center text-muted-foreground">
                  A carregar utilizadores...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.fullName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {getRoleBadge(user.roles[0] || 'analyst')}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'status-badge',
                              user.isActive
                                ? 'bg-success/15 text-success'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('pt-MZ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleToggleUserActive(user)}
                            >
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging">
          <div className="space-y-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Preferências de Comunicação</CardTitle>
                <CardDescription>
                  Configure canais, horários e regras de envio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingMessaging || !msgSettings ? (
                  <div className="py-8 text-center text-muted-foreground">
                    A carregar configurações de comunicação...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Canal Padrão</Label>
                        <Select
                          value={msgSettings.defaultChannel}
                          onValueChange={(v) =>
                            setMsgSettings((s) =>
                              s
                                ? {
                                    ...s,
                                    defaultChannel: v as 'whatsapp' | 'sms',
                                  }
                                : s
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Hora Início</Label>
                          <Input
                            type="time"
                            value={msgSettings.allowedHoursStart}
                            onChange={(e) =>
                              setMsgSettings((s) =>
                                s
                                  ? { ...s, allowedHoursStart: e.target.value }
                                  : s
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Hora Fim</Label>
                          <Input
                            type="time"
                            value={msgSettings.allowedHoursEnd}
                            onChange={(e) =>
                              setMsgSettings((s) =>
                                s
                                  ? { ...s, allowedHoursEnd: e.target.value }
                                  : s
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Dias de lembrete antes do vencimento</Label>
                        <Input
                          value={reminderDaysInput}
                          onChange={(e) => setReminderDaysInput(e.target.value)}
                          placeholder="Ex: 3,1,0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separados por vírgula (ex: 3, 1, 0)
                        </p>
                      </div>

                      <div>
                        <Label>Dias de aviso após atraso</Label>
                        <Input
                          value={lateDaysInput}
                          onChange={(e) => setLateDaysInput(e.target.value)}
                          placeholder="Ex: 1, 3, 7, 14, 30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separados por vírgula
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        try {
                          if (!msgSettings) return;

                          const tenantId =
                            currentUser?.tenantId ||
                            '11111111-1111-1111-1111-111111111111';

                          const parseDays = (value: string): number[] => {
                            return value
                              .split(',')
                              .map((n) => parseInt(n.trim()))
                              .filter((n) => !isNaN(n));
                          };

                          await messagingConfigService.saveSettings({
                            tenantId,
                            defaultChannel: msgSettings.defaultChannel,
                            allowedHoursStart: msgSettings.allowedHoursStart,
                            allowedHoursEnd: msgSettings.allowedHoursEnd,
                            reminderDaysBefore: parseDays(reminderDaysInput),
                            lateDaysAfter: parseDays(lateDaysInput),
                          });

                          auditService.log(
                            currentUser?.id || '',
                            currentUser?.fullName || '',
                            'ACTUALIZAR_CONFIG_COMUNICACAO',
                            'messaging_settings',
                            tenantId,
                            'Preferências de comunicação actualizadas'
                          );

                          toast({
                            title: 'Preferências guardadas',
                            description:
                              'As configurações de comunicação foram actualizadas.',
                          });

                          await loadMessagingConfig();
                        } catch (error) {
                          console.error('Erro ao guardar preferências:', error);
                          toast({
                            title: 'Erro',
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Não foi possível guardar as preferências.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={!msgSettings}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Preferências
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Templates de Mensagem</CardTitle>
                <CardDescription>
                  Edite os modelos de mensagem. Variáveis: {'{clientName}'}, {'{amountDue}'}, {'{daysLate}'}, {'{dueDate}'}, {'{nextInstallmentDate}'}, {'{institutionName}'}, {'{promiseDate}'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingMessaging ? (
                  <div className="py-8 text-center text-muted-foreground">
                    A carregar templates...
                  </div>
                ) : (
                  msgTemplates.map((tpl) => (
                    <div key={tpl.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tpl.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {tpl.type}
                          </Badge>
                          {tpl.isDefault && <Badge className="text-xs">Padrão</Badge>}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              if (editingTemplateId === tpl.id) {
                                const updated = await messagingConfigService.updateTemplate(
                                  tpl.id,
                                  {
                                    body: editingTemplateBody,
                                    updatedBy: currentUser?.fullName,
                                  }
                                );

                                setMsgTemplates((prev) =>
                                  prev.map((t) => (t.id === tpl.id ? updated : t))
                                );

                                setEditingTemplateId(null);

                                auditService.log(
                                  currentUser?.id || '',
                                  currentUser?.fullName || '',
                                  'MESSAGE_TEMPLATE_UPDATED',
                                  'messageTemplate',
                                  tpl.id,
                                  tpl.name
                                );

                                toast({ title: 'Template actualizado' });
                              } else {
                                setEditingTemplateId(tpl.id);
                                setEditingTemplateBody(tpl.body);
                              }
                            } catch (error) {
                              console.error('Erro ao actualizar template:', error);
                              toast({
                                title: 'Erro',
                                description:
                                  error instanceof Error
                                    ? error.message
                                    : 'Não foi possível actualizar o template.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          {editingTemplateId === tpl.id ? (
                            <>
                              <Save className="w-4 h-4 mr-1" />
                              Guardar
                            </>
                          ) : (
                            <>
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </>
                          )}
                        </Button>
                      </div>

                      {editingTemplateId === tpl.id ? (
                        <Textarea
                          value={editingTemplateBody}
                          onChange={(e) => setEditingTemplateBody(e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {tpl.body}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="space-y-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Versão</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Moeda</p>
                    <p className="font-medium">MZN (Metical)</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fuso Horário</p>
                    <p className="font-medium">África/Maputo (CAT)</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Idioma</p>
                    <p className="font-medium">Português (MZ)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros do produto de crédito
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Produto</Label>
              <Input
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Microcrédito Rápido"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Breve descrição do produto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mínimo (MZN)</Label>
                <Input
                  type="number"
                  value={productForm.minAmount}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      minAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Valor Máximo (MZN)</Label>
                <Input
                  type="number"
                  value={productForm.maxAmount}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      maxAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prazo Mínimo (meses)</Label>
                <Input
                  type="number"
                  value={productForm.minTermMonths}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      minTermMonths: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Prazo Máximo (meses)</Label>
                <Input
                  type="number"
                  value={productForm.maxTermMonths}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      maxTermMonths: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taxa de Juros Padrão (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={productForm.defaultInterestRate}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      defaultInterestRate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Taxa Administrativa (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={productForm.adminFeeRate}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      adminFeeRate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Multa por Atraso (%/dia)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.latePenaltyRate}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      latePenaltyRate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Dias de Carência</Label>
                <Input
                  type="number"
                  value={productForm.gracePeriodDays}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      gracePeriodDays: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={productForm.isActive}
                onCheckedChange={(v) =>
                  setProductForm((f) => ({ ...f, isActive: v }))
                }
              />
              <Label>Produto Activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSaveProduct()}
              disabled={!productForm.name}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Utilizador' : 'Novo Utilizador'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados do utilizador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Nome do utilizador"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@exemplo.co.mz"
                disabled={!!editingUser}
              />
            </div>

            {!editingUser && (
              <div>
                <Label>Senha Inicial</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Defina a senha inicial"
                />
              </div>
            )}

            <div>
              <Label>Telefone</Label>
              <Input
                value={userForm.phone}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+258..."
              />
            </div>

            <div>
              <Label>Perfil</Label>
              <div className="flex gap-2 mt-2">
                {(['admin', 'analyst', 'cashier'] as UserRole[]).map((role) => (
                  <Button
                    key={role}
                    variant={userForm.role === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUserForm((f) => ({ ...f, role }))}
                  >
                    {role === 'admin'
                      ? 'Administrador'
                      : role === 'analyst'
                      ? 'Analista'
                      : 'Caixa'}
                  </Button>
                ))}
              </div>
            </div>

            {editingUser && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={userForm.isActive}
                  onCheckedChange={(v) =>
                    setUserForm((f) => ({ ...f, isActive: v }))
                  }
                />
                <Label>Utilizador activo</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSaveUser()}
              disabled={
                !userForm.fullName ||
                !userForm.email ||
                (!editingUser && !userForm.password)
              }
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}