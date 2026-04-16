import { useState, useEffect } from 'react';
import { Send, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loan, Client } from '@/models/types';
import {
  messagingService,
  MessageChannel,
  MessageType,
  isValidMozambiquePhone,
} from '@/services/messagingService';
import { messageService } from '@/services/messages/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  loan: Loan;
  type: MessageType;
  onSent?: () => void;
}

export default function SendMessageModal({
  open,
  onOpenChange,
  client,
  loan,
  type,
  onSent,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [channel, setChannel] = useState<MessageChannel>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);

  const templates = messagingService.getTemplates().filter((t) => t.type === type);
  const settings = messagingService.getSettings();
  const phoneValid = isValidMozambiquePhone(client.phone);
  const canSend = messagingService.canSendToday(loan.id, type);
  const optOut = (client as any).allowMessages === false;

  useEffect(() => {
    if (open) {
      setChannel(settings.defaultChannel);

      const defaultTpl = templates.find((t) => t.isDefault) || templates[0];
      if (defaultTpl) {
        setSelectedTemplateId(defaultTpl.id);
        setMessageText(
          messagingService.interpolate(defaultTpl.body, {
            client,
            loan,
            agentName: user?.fullName || user?.fullName,
          })
        );
      } else {
        setSelectedTemplateId('');
        setMessageText('');
      }
    }
  }, [open, settings.defaultChannel, templates, client, loan, user]);

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);

    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setMessageText(
        messagingService.interpolate(tpl.body, {
          client,
          loan,
          agentName: user?.fullName || user?.fullName,
        })
      );
    }
  };

  const handleSend = async () => {
    if (!user) return;

    if (!messageText.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Escreva uma mensagem antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (optOut) {
      toast({
        title: 'Envio bloqueado',
        description: 'Este cliente optou por não receber mensagens.',
        variant: 'destructive',
      });
      return;
    }

    if (!phoneValid) {
      toast({
        title: 'Número inválido',
        description: `O contacto ${client.phone} não é válido.`,
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      const result = messagingService.send(
        channel,
        client,
        loan,
        messageText,
        type,
        user.id,
        user.fullName || user.fullName || 'Utilizador'
      );

      if (result.success) {
        await messageService.createLog({
          tenantId: loan.tenantId,
          clientId: client.id,
          loanId: loan.id,
          channel,
          type,
          status: 'SENT',
          recipient: client.phone,
          messageText,
          sentBy: user.id,
        });

        toast({
          title: 'Mensagem enviada',
          description: `${
            channel === 'whatsapp' ? 'WhatsApp' : 'SMS'
          } aberto com a mensagem preenchida.`,
        });

        onOpenChange(false);
        onSent?.();
      } else {
        await messageService.createLog({
          tenantId: loan.tenantId,
          clientId: client.id,
          loanId: loan.id,
          channel,
          type,
          status: result.reason === 'Já foi enviada uma mensagem deste tipo hoje para este empréstimo.' ? 'SKIPPED' : 'FAILED',
          recipient: client.phone,
          messageText,
          reason: result.reason,
          sentBy: user.id,
        });

        toast({
          title: 'Não foi possível enviar',
          description: result.reason,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao enviar/registar mensagem:', error);

      try {
        await messageService.createLog({
          tenantId: loan.tenantId,
          clientId: client.id,
          loanId: loan.id,
          channel,
          type,
          status: 'FAILED',
          recipient: client.phone,
          messageText,
          reason: error instanceof Error ? error.message : 'Erro inesperado',
          sentBy: user.id,
        });
      } catch (logError) {
        console.error('Erro ao gravar log de falha:', logError);
      }

      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao tentar enviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {type === 'LATE' ? 'Mensagem de Atraso' : 'Lembrete de Pagamento'}
          </DialogTitle>
          <DialogDescription>
            {client.fullName} • {loan.loanNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {optOut && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
               Este cliente optou por não receber mensagens (opt-out).
            </div>
          )}

          {!canSend && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
              Já foi enviada uma mensagem deste tipo hoje para este empréstimo.
            </div>
          )}

          {!phoneValid && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              Número de telefone inválido: {client.phone}
            </div>
          )}

          <div>
            <Label>Canal de envio</Label>
            <div className="flex gap-2 mt-1">
              <Button
                variant={channel === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChannel('whatsapp')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>

              <Button
                variant={channel === 'sms' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChannel('sms')}
                className="flex-1"
              >
                <Smartphone className="w-4 h-4 mr-1" />
                SMS
              </Button>
            </div>
          </div>

          <div>
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.isDefault && '(padrão)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem (editável)</Label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {messageText.length} caracteres
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">📱 {client.phone}</Badge>
            <Badge variant="outline">
              {type === 'LATE' ? `${loan.daysOverdue} dias atraso` : 'Lembrete'}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || optOut || sending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending
              ? 'A processar...'
              : `Enviar via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}