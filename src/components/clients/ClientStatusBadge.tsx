import React, { useState } from 'react';
import { ClientStatus } from '@/models/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Circle, Lock, XCircle, Ban, LogOut, Clock,
  AlertTriangle
} from 'lucide-react';

interface ClientStatusBadgeProps {
  status: ClientStatus;
  onChange?: (newStatus: ClientStatus) => void;
}

const STATUS_CONFIG: Record<ClientStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  confirmMessage: string;
}> = {
  active: {
    label: 'Activo',
    icon: CheckCircle2,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Cliente em plena actividade',
    confirmMessage: 'O cliente será reactivado e poderá solicitar novos empréstimos.',
  },
  locked: {
    label: 'Bloqueado',
    icon: Lock,
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Impedido de novas operações',
    confirmMessage: 'O cliente ficará impedido de solicitar novos empréstimos.',
  },
  closed: {
    label: 'Encerrado',
    icon: XCircle,
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Relacionamento encerrado',
    confirmMessage: 'O relacionamento com o cliente será encerrado.',
  },
  rejected: {
    label: 'Rejeitado',
    icon: Ban,
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Cadastro rejeitado',
    confirmMessage: 'Solicitações futuras serão bloqueadas.',
  },
  withdrawn: {
    label: 'Desistiu',
    icon: LogOut,
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Cliente desistiu voluntariamente',
    confirmMessage: 'O cliente será marcado como desistente.',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    color: 'text-yellow-700 dark:text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Aguardando aprovação de cadastro',
    confirmMessage: 'O cliente voltará ao estado pendente de aprovação.',
  },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as ClientStatus[];

export function ClientStatusBadge({ status, onChange }: ClientStatusBadgeProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ClientStatus | null>(null);

  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const badgeElement = (
    <Badge
      className={`${cfg.bgColor} ${cfg.color} ${cfg.borderColor} border gap-1.5 px-2.5 py-1 text-xs font-semibold select-none transition-all ${
        isAdmin ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-not-allowed opacity-90'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </Badge>
  );

  const handleSelect = (newStatus: ClientStatus) => {
    if (newStatus === status) {
      setPopoverOpen(false);
      return;
    }
    setPopoverOpen(false);
    setConfirmDialog(newStatus);
  };

  const handleConfirm = () => {
    if (confirmDialog && onChange) {
      onChange(confirmDialog);
    }
    setConfirmDialog(null);
  };

  // Non-admin: badge + tooltip
  if (!isAdmin) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{badgeElement}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[220px]">
            Apenas administradores podem alterar o estado do cliente
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Admin: badge + popover + confirmation dialog
  const confirmCfg = confirmDialog ? STATUS_CONFIG[confirmDialog] : null;
  const ConfirmIcon = confirmCfg?.icon ?? AlertTriangle;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {badgeElement}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1.5" align="start">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Alterar estado</p>
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CONFIG[s];
            const SIcon = c.icon;
            const isCurrent = s === status;
            return (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  isCurrent ? 'bg-accent/60 font-medium' : ''
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${c.bgColor} ${c.borderColor} border`}>
                  <SIcon className={`h-3.5 w-3.5 ${c.color}`} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{c.description}</span>
                </span>
                {isCurrent && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmCfg && <ConfirmIcon className={`h-5 w-5 ${confirmCfg.color}`} />}
              Confirmar alteração de estado
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="flex items-center gap-1.5">
                De <Badge className={`${cfg.bgColor} ${cfg.color} ${cfg.borderColor} border gap-1 text-xs`}><Icon className="h-3 w-3" />{cfg.label}</Badge>
                → {confirmCfg && (
                  <Badge className={`${confirmCfg.bgColor} ${confirmCfg.color} ${confirmCfg.borderColor} border gap-1 text-xs`}>
                    <ConfirmIcon className="h-3 w-3" />{confirmCfg.label}
                  </Badge>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 mt-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{confirmCfg?.confirmMessage}</p>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
