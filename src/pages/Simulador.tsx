import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Download, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calcService } from '@/services/calcService';
import { useToast } from '@/components/ui/use-toast';

type AmortMethod = 'price' | 'sac';

interface Schedule {
  n: number;
  dueDate: Date;
  principal: number;
  interest: number;
  installment: number;
  balance: number;
}

const PURPOSES = [
  'Consumo', 'Comércio', 'Agricultura', 'Pecuária',
  'Indústria', 'Serviços', 'CFSP', 'Outros',
];

export default function Simulador() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [nuit, setNuit] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [term, setTerm] = useState<string>('');
  const [method, setMethod] = useState<AmortMethod>('price');
  const [adminFee, setAdminFee] = useState<string>('');
  const [insurance, setInsurance] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [calculated, setCalculated] = useState(false);

  const principal = parseFloat(amount) || 0;
  const monthlyRate = (parseFloat(rate) || 0) / 100;
  const months = parseInt(term) || 0;
  const adminFeeNum = parseFloat(adminFee) || 0;
  const insuranceNum = parseFloat(insurance) || 0;

  const schedule = useMemo<Schedule[]>(() => {
    if (!principal || !months) return [];
    const start = new Date(startDate);
    const list: Schedule[] = [];
    let balance = principal;

    if (method === 'price') {
      const pmt = calcService.calculateMonthlyPayment(principal, monthlyRate, months);
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principalPart = pmt - interest;
        balance -= principalPart;
        const due = new Date(start);
        due.setMonth(due.getMonth() + i);
        list.push({
          n: i,
          dueDate: due,
          principal: principalPart,
          interest,
          installment: pmt,
          balance: Math.max(0, balance),
        });
      }
    } else {
      const principalPart = principal / months;
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const installment = principalPart + interest;
        balance -= principalPart;
        const due = new Date(start);
        due.setMonth(due.getMonth() + i);
        list.push({
          n: i,
          dueDate: due,
          principal: principalPart,
          interest,
          installment,
          balance: Math.max(0, balance),
        });
      }
    }
    return list;
  }, [principal, monthlyRate, months, method, startDate]);

  const summary = useMemo(() => {
    const totalInterest = schedule.reduce((s, x) => s + x.interest, 0);
    const totalPaid = schedule.reduce((s, x) => s + x.installment, 0);
    const firstPmt = schedule[0]?.installment || 0;
    const lastPmt = schedule[schedule.length - 1]?.installment || 0;
    const variable = method === 'sac';
    const totalCost = totalPaid + adminFeeNum + insuranceNum;
    const interestPct = principal > 0 ? (totalInterest / principal) * 100 : 0;
    const clientReceives = principal - adminFeeNum - insuranceNum;
    const endDate = schedule[schedule.length - 1]?.dueDate;
    return {
      firstPmt, lastPmt, variable, totalInterest, interestPct,
      totalCost, clientReceives, endDate, totalPaid,
    };
  }, [schedule, adminFeeNum, insuranceNum, principal, method]);

  const fmt = (v: number) => calcService.formatCurrency(v);

  const handleCalculate = () => {
    if (!name || !principal || !monthlyRate || !months || !purpose) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, valor, taxa, prestações e finalidade.',
        variant: 'destructive',
      });
      return;
    }
    setCalculated(true);
  };

  const handleExportCSV = () => {
    const header = ['Nº', 'Vencimento', 'Capital (MT)', 'Juros (MT)', 'Prestação (MT)', 'Saldo (MT)'];
    const rows = schedule.map(s => [
      s.n,
      s.dueDate.toLocaleDateString('pt-MZ'),
      s.principal.toFixed(2),
      s.interest.toFixed(2),
      s.installment.toFixed(2),
      s.balance.toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao_${name.replace(/\s+/g, '_') || 'cliente'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Simulador de Crédito</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              Simule rapidamente um empréstimo com plano de amortização completo
            </p>
          </div>
        </div>
        {calculated && (
          <div className="flex gap-2 print:hidden w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Form */}
        <Card className="lg:col-span-2 print:hidden">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base">Dados da simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nome Completo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>NUIT</Label>
                <Input value={nuit} onChange={(e) => setNuit(e.target.value)} placeholder="123456789" />
              </div>
              <div className="space-y-1.5">
                <Label>Contactos</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+258 84 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor do empréstimo * (MT)</Label>
                <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de juros mensal * (%)</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de prestações *</Label>
                <Input type="number" inputMode="numeric" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="12" />
              </div>
              <div className="space-y-1.5">
                <Label>Sistema de amortização</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as AmortMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Mensal (PRICE)</SelectItem>
                    <SelectItem value="sac">SAC (decrescente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Taxa administrativa (MT) *</Label>
                <Input type="number" inputMode="decimal" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Seguros (MT)</Label>
                <Input type="number" inputMode="decimal" value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Finalidade do empréstimo *</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue placeholder="-- Selecione a finalidade --" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleCalculate}>
              <Calculator className="w-4 h-4 mr-2" /> Calcular simulação
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Resumo da simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!calculated ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Preencha os campos e clique em <strong>Calcular</strong> para ver o resumo.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="bg-primary text-primary-foreground p-3 sm:p-4 rounded-lg">
                  <div className="text-[10px] sm:text-xs opacity-80 uppercase tracking-wider">Prestação mensal</div>
                  <div className="text-xl sm:text-2xl font-bold break-all">{fmt(summary.firstPmt)}</div>
                  {summary.variable && (
                    <div className="text-[10px] sm:text-xs opacity-80 mt-1">
                      Última: {fmt(summary.lastPmt)} (prestação variável)
                    </div>
                  )}
                </div>
                <Row label={`Total de juros (${summary.interestPct.toFixed(2)}%)`} value={fmt(summary.totalInterest)} />
                <Row label="Custo total do empréstimo" value={fmt(summary.totalCost)} bold />
                <Row label="Taxa administrativa" value={fmt(adminFeeNum)} />
                <Row label="Seguros" value={fmt(insuranceNum)} />
                <Row label="Valor que o cliente recebe" value={fmt(summary.clientReceives)} highlight />
                <Row label="Prazo" value={`${months} mes(es)`} />
                <Row label="Data de início" value={new Date(startDate).toLocaleDateString('pt-MZ')} />
                <Row label="Data de fim" value={summary.endDate ? summary.endDate.toLocaleDateString('pt-MZ') : '—'} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      {calculated && schedule.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base">Plano de amortização</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {schedule.map(s => (
                <div key={s.n} className="rounded-lg border bg-card p-3 text-xs">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <span className="font-semibold">Parcela #{s.n}</span>
                    <span className="text-muted-foreground">{s.dueDate.toLocaleDateString('pt-MZ')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="text-muted-foreground">Capital</div>
                    <div className="text-right">{fmt(s.principal)}</div>
                    <div className="text-muted-foreground">Juros</div>
                    <div className="text-right text-amber-600">{fmt(s.interest)}</div>
                    <div className="text-muted-foreground font-medium">Prestação</div>
                    <div className="text-right font-semibold">{fmt(s.installment)}</div>
                    <div className="text-muted-foreground">Saldo</div>
                    <div className="text-right text-muted-foreground">{fmt(s.balance)}</div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg bg-primary/10 p-3 text-xs font-semibold">
                <div className="flex justify-between mb-1"><span>Total Capital</span><span>{fmt(schedule.reduce((a, b) => a + b.principal, 0))}</span></div>
                <div className="flex justify-between mb-1"><span>Total Juros</span><span>{fmt(summary.totalInterest)}</span></div>
                <div className="flex justify-between"><span>Total Pago</span><span>{fmt(summary.totalPaid)}</span></div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">Nº</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead className="text-right">Prestação</TableHead>
                    <TableHead className="text-right">Saldo devedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map(s => (
                    <TableRow key={s.n}>
                      <TableCell className="font-medium">{s.n}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.dueDate.toLocaleDateString('pt-MZ')}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmt(s.principal)}</TableCell>
                      <TableCell className="text-right text-amber-600 whitespace-nowrap">{fmt(s.interest)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmt(s.installment)}</TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">{fmt(s.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell colSpan={2}>TOTAIS</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmt(schedule.reduce((a, b) => a + b.principal, 0))}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmt(summary.totalInterest)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmt(summary.totalPaid)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center gap-2 py-1.5 border-b border-border/50 last:border-0 ${highlight ? 'text-success' : ''}`}>
      <span className="text-muted-foreground text-xs sm:text-sm shrink-0">{label}</span>
      <span className={`text-right break-all ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
