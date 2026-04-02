import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { storageService } from '@/services/storageService';
import { auditService } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { Client, MOZAMBIQUE_PROVINCES, MOZAMBIQUE_DISTRICTS, Gender } from '@/models/types';
import { clientService } from '@/services/clients/clientService';
import {
  normalizeBi,
  normalizeNuit,
  normalizePhone,
  validateBi,
  validateNuit,
  validateMzPhone,
} from '@/lib/validators/identityValidators';

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
}

interface FormErrors {
  [key: string]: string;
}

export function ClientFormModal({ open, onOpenChange, client, onSuccess }: ClientFormModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'M' as Gender,
    phone: '',
    email: '',
    address: '',
    province: '',
    district: '',
    biNumber: '',
    nuit: '',
    employer: '',
    occupation: '',
    monthlyIncome: '',
    monthlyExpenses: '',
    reference1Name: '',
    reference1Phone: '',
    reference1Relationship: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Relationship: '',
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        fullName: client.fullName,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender,
        phone: client.phone,
        email: client.email || '',
        address: client.address,
        province: client.province,
        district: client.district,
        biNumber: client.biNumber,
        nuit: client.nuit || '',
        employer: client.employer || '',
        occupation: client.occupation,
        monthlyIncome: client.monthlyIncome.toString(),
        monthlyExpenses: client.monthlyExpenses.toString(),
        reference1Name: client.reference1.name,
        reference1Phone: client.reference1.phone,
        reference1Relationship: client.reference1.relationship,
        reference2Name: client.reference2.name,
        reference2Phone: client.reference2.phone,
        reference2Relationship: client.reference2.relationship,
        notes: client.notes || '',
      });
    } else {
      setFormData({
        fullName: '',
        dateOfBirth: '',
        gender: 'M',
        phone: '',
        email: '',
        address: '',
        province: '',
        district: '',
        biNumber: '',
        nuit: '',
        employer: '',
        occupation: '',
        monthlyIncome: '',
        monthlyExpenses: '',
        reference1Name: '',
        reference1Phone: '',
        reference1Relationship: '',
        reference2Name: '',
        reference2Phone: '',
        reference2Relationship: '',
        notes: '',
      });
    }
    setErrors({});
  }, [client, open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Nome deve ter pelo menos 3 caracteres';
    }

    const phoneValidation = validateMzPhone(formData.phone);
    if (!phoneValidation.valid) {
      newErrors.phone = phoneValidation.message || 'Telefone inválido';
    }

    const biValidation = validateBi(formData.biNumber);
    if (!biValidation.valid) {
      newErrors.biNumber = biValidation.message || 'Formato de BI inválido';
    }

    const nuitValidation = validateNuit(formData.nuit);
    if (!nuitValidation.valid) {
      newErrors.nuit = nuitValidation.message || 'NUIT inválido';
    }

    // Check for duplicate BI
    const normalizedBi = normalizeBi(formData.biNumber);
    const existingClient = storageService
      .getAll<Client>('clients')
      .find((c) => normalizeBi(c.biNumber) === normalizedBi && c.id !== client?.id);

    if (existingClient) {
      newErrors.biNumber = `BI já registado para: ${existingClient.fullName}`;
    }

    // Check for duplicate NUIT
    if (formData.nuit) {
      const normalizedClientNuit = normalizeNuit(formData.nuit);
      const existingNuit = storageService
        .getAll<Client>('clients')
        .find(
          (c) =>
            normalizeNuit(c.nuit || '') === normalizedClientNuit &&
            c.id !== client?.id
        );

      if (existingNuit) {
        newErrors.nuit = `NUIT já registado para: ${existingNuit.fullName}`;
      }
    }

    if (!formData.province) {
      newErrors.province = 'Província é obrigatória';
    }

    if (!formData.district) {
      newErrors.district = 'Distrito é obrigatório';
    }

    if (!formData.occupation.trim()) {
      newErrors.occupation = 'Ocupação é obrigatória';
    }

    const income = parseFloat(formData.monthlyIncome);
    if (!formData.monthlyIncome || isNaN(income) || income <= 0) {
      newErrors.monthlyIncome = 'Rendimento mensal é obrigatório';
    }

    const expenses = parseFloat(formData.monthlyExpenses);
    if (!formData.monthlyExpenses || isNaN(expenses) || expenses < 0) {
      newErrors.monthlyExpenses = 'Despesas mensais são obrigatórias';
    }

    if (!formData.reference1Name.trim()) {
      newErrors.reference1Name = 'Nome da referência 1 é obrigatório';
    }
    if (!formData.reference1Phone.trim()) {
      newErrors.reference1Phone = 'Telefone da referência 1 é obrigatório';
    }
    if (!formData.reference1Relationship.trim()) {
      newErrors.reference1Relationship = 'Relação da referência 1 é obrigatória';
    }

    if (!formData.reference2Name.trim()) {
      newErrors.reference2Name = 'Nome da referência 2 é obrigatório';
    }
    if (!formData.reference2Phone.trim()) {
      newErrors.reference2Phone = 'Telefone da referência 2 é obrigatório';
    }
    if (!formData.reference2Relationship.trim()) {
      newErrors.reference2Relationship = 'Relação da referência 2 é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({
        title: 'Erro de validação',
        description: 'Corrija os campos destacados',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();

      const payload = {
        full_name: formData.fullName.trim(),
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender,
        phone: normalizePhone(formData.phone),
        email: formData.email.trim() || null,
        address: formData.address.trim(),
        province: formData.province,
        district: formData.district,
        bi_number: normalizeBi(formData.biNumber),
        nuit: formData.nuit ? normalizeNuit(formData.nuit) : null,
        employer: formData.employer.trim() || null,
        occupation: formData.occupation.trim(),
        monthly_income: parseFloat(formData.monthlyIncome),
        monthly_expenses: parseFloat(formData.monthlyExpenses),

        reference1_name: formData.reference1Name.trim(),
        reference1_phone: normalizePhone(formData.reference1Phone),
        reference1_relationship: formData.reference1Relationship.trim(),

        reference2_name: formData.reference2Name.trim(),
        reference2_phone: normalizePhone(formData.reference2Phone),
        reference2_relationship: formData.reference2Relationship.trim(),

        notes: formData.notes.trim() || null,
        updated_at: now,
      };

      if (isEditing && client) {
        await clientService.update(client.id, payload);

        auditService.log(
          user?.id || '',
          user?.fullName || '',
          'EDITAR_CLIENTE',
          'client',
          client.id,
          client.fullName
        );

        toast({
          title: 'Cliente actualizado',
          description: 'Os dados foram guardados com sucesso',
        });
      } else {
        await clientService.create({
          ...payload,
          tenant_id: '11111111-1111-1111-1111-111111111111',
          status: 'active',
          created_at: now,
        });

        auditService.log(
          user?.id || '',
          user?.fullName || '',
          'CRIAR_CLIENTE',
          'client',
          '',
          formData.fullName
        );

        toast({
          title: 'Cliente criado',
          description: 'O cliente foi registado com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao guardar cliente:', error);

      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao guardar cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const districts = formData.province ? MOZAMBIQUE_DISTRICTS[formData.province] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualize os dados do cliente' : 'Preencha os dados para registar um novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="financial">Dados Financeiros</TabsTrigger>
            <TabsTrigger value="references">Referências</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.fullName}
                  onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nome completo do cliente"
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={e => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>

              <div>
                <Label>Género</Label>
                <Select value={formData.gender} onValueChange={v => setFormData(prev => ({ ...prev, gender: v as Gender }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.phone}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="+258840000000"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.co.mz"
                />
              </div>

              <div>
                <Label>Número do BI *</Label>
                <Input
                  value={formData.biNumber}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      biNumber: normalizeBi(e.target.value),
                    }))
                  }
                  placeholder="Ex: 100105369203S"
                  maxLength={13}
                  className={errors.biNumber ? 'border-destructive' : ''}
                />
                {errors.biNumber && <p className="text-xs text-destructive mt-1">{errors.biNumber}</p>}
              </div>

              <div>
                <Label>NUIT</Label>
                <Input
                  value={formData.nuit}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      nuit: normalizeNuit(e.target.value),
                    }))
                  }
                  placeholder="123456789"
                  maxLength={9}
                  className={errors.nuit ? 'border-destructive' : ''}
                />
                {errors.nuit && <p className="text-xs text-destructive mt-1">{errors.nuit}</p>}
              </div>

              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Bairro, Rua, Número"
                />
              </div>

              <div>
                <Label>Província *</Label>
                <Select
                  value={formData.province}
                  onValueChange={v => setFormData(prev => ({ ...prev, province: v, district: '' }))}
                >
                  <SelectTrigger className={errors.province ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOZAMBIQUE_PROVINCES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.province && <p className="text-xs text-destructive mt-1">{errors.province}</p>}
              </div>

              <div>
                <Label>Distrito *</Label>
                <Select
                  value={formData.district}
                  onValueChange={v => setFormData(prev => ({ ...prev, district: v }))}
                  disabled={!formData.province}
                >
                  <SelectTrigger className={errors.district ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district && <p className="text-xs text-destructive mt-1">{errors.district}</p>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ocupação *</Label>
                <Input
                  value={formData.occupation}
                  onChange={e => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  placeholder="Ex: Comerciante"
                  className={errors.occupation ? 'border-destructive' : ''}
                />
                {errors.occupation && <p className="text-xs text-destructive mt-1">{errors.occupation}</p>}
              </div>

              <div>
                <Label>Empregador / Empresa</Label>
                <Input
                  value={formData.employer}
                  onChange={e => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                  placeholder="Nome do empregador ou 'Autónomo'"
                />
              </div>

              <div>
                <Label>Rendimento Mensal (MZN) *</Label>
                <Input
                  type="number"
                  value={formData.monthlyIncome}
                  onChange={e => setFormData(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                  placeholder="0.00"
                  className={errors.monthlyIncome ? 'border-destructive' : ''}
                />
                {errors.monthlyIncome && <p className="text-xs text-destructive mt-1">{errors.monthlyIncome}</p>}
              </div>

              <div>
                <Label>Despesas Mensais (MZN) *</Label>
                <Input
                  type="number"
                  value={formData.monthlyExpenses}
                  onChange={e => setFormData(prev => ({ ...prev, monthlyExpenses: e.target.value }))}
                  placeholder="0.00"
                  className={errors.monthlyExpenses ? 'border-destructive' : ''}
                />
                {errors.monthlyExpenses && <p className="text-xs text-destructive mt-1">{errors.monthlyExpenses}</p>}
              </div>

              <div className="col-span-2">
                <Label>Notas / Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="references" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3">Referência 1</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.reference1Name}
                    onChange={e => setFormData(prev => ({ ...prev, reference1Name: e.target.value }))}
                    className={errors.reference1Name ? 'border-destructive' : ''}
                  />
                  {errors.reference1Name && <p className="text-xs text-destructive mt-1">{errors.reference1Name}</p>}
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.reference1Phone}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        reference1Phone: e.target.value,
                      }))
                    }
                    className={errors.reference1Phone ? 'border-destructive' : ''}
                  />
                  {errors.reference1Phone && <p className="text-xs text-destructive mt-1">{errors.reference1Phone}</p>}
                </div>
                <div>
                  <Label>Relação *</Label>
                  <Input
                    value={formData.reference1Relationship}
                    onChange={e => setFormData(prev => ({ ...prev, reference1Relationship: e.target.value }))}
                    placeholder="Ex: Cônjuge, Irmão"
                    className={errors.reference1Relationship ? 'border-destructive' : ''}
                  />
                  {errors.reference1Relationship && <p className="text-xs text-destructive mt-1">{errors.reference1Relationship}</p>}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3">Referência 2</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.reference2Name}
                    onChange={e => setFormData(prev => ({ ...prev, reference2Name: e.target.value }))}
                    className={errors.reference2Name ? 'border-destructive' : ''}
                  />
                  {errors.reference2Name && <p className="text-xs text-destructive mt-1">{errors.reference2Name}</p>}
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.reference2Phone}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        reference2Phone: e.target.value,
                      }))
                    }
                    className={errors.reference2Phone ? 'border-destructive' : ''}
                  />
                  {errors.reference2Phone && <p className="text-xs text-destructive mt-1">{errors.reference2Phone}</p>}
                </div>
                <div>
                  <Label>Relação *</Label>
                  <Input
                    value={formData.reference2Relationship}
                    onChange={e => setFormData(prev => ({ ...prev, reference2Relationship: e.target.value }))}
                    placeholder="Ex: Colega, Vizinho"
                    className={errors.reference2Relationship ? 'border-destructive' : ''}
                  />
                  {errors.reference2Relationship && <p className="text-xs text-destructive mt-1">{errors.reference2Relationship}</p>}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'A guardar...' : isEditing ? 'Guardar Alterações' : 'Criar Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}