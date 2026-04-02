 // Mock Data Generator - Mozambique Context
 import { 
   User, 
   Client, 
   LoanProduct, 
   LoanApplication, 
   Contract, 
   Loan, 
   Payment, 
   Disbursement,
   PaymentScheduleItem,
   MOZAMBIQUE_PROVINCES,
   MOZAMBIQUE_DISTRICTS,
   GUARANTEE_TYPES,
   LOAN_PURPOSES,
   PaymentMethod
 } from '@/models/types';
 import { storageService } from './storageService';
 import { calcService } from './calcService';
 
 // Seeded random for consistent data
 let seed = 12345;
 function seededRandom(): number {
   seed = (seed * 16807) % 2147483647;
   return (seed - 1) / 2147483646;
 }
 
 function randomInt(min: number, max: number): number {
   return Math.floor(seededRandom() * (max - min + 1)) + min;
 }
 
 function randomElement<T>(arr: readonly T[] | T[]): T {
   return arr[Math.floor(seededRandom() * arr.length)];
 }
 
 function randomDate(start: Date, end: Date): string {
   const date = new Date(start.getTime() + seededRandom() * (end.getTime() - start.getTime()));
   return date.toISOString().split('T')[0];
 }
 
 function generateId(): string {
   return Math.random().toString(36).substring(2, 11);
 }
 
 // Mozambican names
 const firstNamesMale = ['João', 'Carlos', 'António', 'Manuel', 'José', 'Fernando', 'Pedro', 'Miguel', 'Joaquim', 'Alberto', 'Francisco', 'Armando', 'Ernesto', 'Domingos', 'Benjamim', 'Celestino', 'Rafael', 'Samuel', 'Tomás', 'Zacarias'];
 const firstNamesFemale = ['Maria', 'Ana', 'Fátima', 'Rosa', 'Luísa', 'Helena', 'Teresa', 'Graça', 'Celeste', 'Esperança', 'Marta', 'Júlia', 'Benedita', 'Amélia', 'Beatriz', 'Catarina', 'Dulce', 'Elisa', 'Filomena', 'Glória'];
 const lastNames = ['Mondlane', 'Machel', 'Chissano', 'Guebuza', 'Nyusi', 'Sitoe', 'Cossa', 'Tembe', 'Macuácua', 'Nhaca', 'Bila', 'Mucavel', 'Timane', 'Cumbe', 'Manjate', 'Zitha', 'Mabunda', 'Chauke', 'Mabote', 'Massinga', 'Vilanculos', 'Nhampossa', 'Matsimbe', 'Cuambe', 'Mavie'];
 
 const occupations = ['Comerciante', 'Vendedor ambulante', 'Agricultor', 'Costureiro(a)', 'Carpinteiro', 'Mecânico', 'Cabeleireiro(a)', 'Pedreiro', 'Motorista', 'Artesão', 'Pescador', 'Criador de gado', 'Dono de barraca', 'Revendedor', 'Padeiro'];
 
 const employers = ['Autónomo', 'Mercado Central', 'Pequeno negócio próprio', 'Cooperativa local', 'Estabelecimento comercial', 'Oficina mecânica', 'Salão de beleza', 'Construção civil'];
 
 function generatePhone(): string {
   const prefixes = ['84', '85', '86', '87', '82', '83'];
   return `+258 ${randomElement(prefixes)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`;
 }
 
 function generateBI(): string {
   const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
   return `${randomInt(100000000, 999999999)}${randomElement(letters.split(''))}`;
 }
 
 function generateNUIT(): string {
   return `${randomInt(100000000, 999999999)}`;
 }
 
 // Generate Users
 function generateUsers(): User[] {
   return [
     {
       id: 'admin-1',
       name: 'Carlos Mondlane',
       email: 'admin@microcredito.co.mz',
       role: 'admin',
       avatar: undefined,
       createdAt: '2023-01-01T00:00:00Z',
     },
     {
       id: 'analyst-1',
       name: 'Ana Sitoe',
       email: 'ana.sitoe@microcredito.co.mz',
       role: 'analyst',
       avatar: undefined,
       createdAt: '2023-02-15T00:00:00Z',
     },
     {
       id: 'analyst-2',
       name: 'Pedro Cossa',
       email: 'pedro.cossa@microcredito.co.mz',
       role: 'analyst',
       avatar: undefined,
       createdAt: '2023-03-01T00:00:00Z',
     },
     {
       id: 'cashier-1',
       name: 'Maria Tembe',
       email: 'caixa@microcredito.co.mz',
       role: 'cashier',
       avatar: undefined,
       createdAt: '2023-02-01T00:00:00Z',
     },
   ];
 }
 
 // Generate Loan Products
 function generateLoanProducts(): LoanProduct[] {
   return [
     {
       id: 'prod-1',
       name: 'Microcrédito Rápido',
       description: 'Empréstimo rápido para pequenas necessidades',
       minAmount: 1000,
       maxAmount: 15000,
       minTermMonths: 1,
       maxTermMonths: 6,
       defaultInterestRate: 5,
       adminFeeRate: 3,
       latePenaltyRate: 0.5,
       gracePeriodDays: 3,
       isActive: true,
       createdAt: '2023-01-01T00:00:00Z',
     },
     {
       id: 'prod-2',
       name: 'Capital de Giro',
       description: 'Para expansão de negócios e capital de trabalho',
       minAmount: 10000,
       maxAmount: 100000,
       minTermMonths: 3,
       maxTermMonths: 12,
       defaultInterestRate: 4,
       adminFeeRate: 2.5,
       latePenaltyRate: 0.3,
       gracePeriodDays: 5,
       isActive: true,
       createdAt: '2023-01-01T00:00:00Z',
     },
     {
       id: 'prod-3',
       name: 'Crédito Agrícola',
       description: 'Apoio a actividades agrícolas e pecuárias',
       minAmount: 5000,
       maxAmount: 75000,
       minTermMonths: 6,
       maxTermMonths: 18,
       defaultInterestRate: 3.5,
       adminFeeRate: 2,
       latePenaltyRate: 0.25,
       gracePeriodDays: 7,
       isActive: true,
       createdAt: '2023-01-01T00:00:00Z',
     },
     {
       id: 'prod-4',
       name: 'Crédito Equipamento',
       description: 'Para aquisição de equipamentos e ferramentas',
       minAmount: 20000,
       maxAmount: 200000,
       minTermMonths: 6,
       maxTermMonths: 24,
       defaultInterestRate: 3,
       adminFeeRate: 2,
       latePenaltyRate: 0.2,
       gracePeriodDays: 5,
       isActive: true,
       createdAt: '2023-01-01T00:00:00Z',
     },
   ];
 }
 
 // Generate Clients
 function generateClients(count: number): Client[] {
   const clients: Client[] = [];
   const now = new Date();
   const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
   
   for (let i = 0; i < count; i++) {
     const isFemale = seededRandom() > 0.5;
     const firstName = randomElement(isFemale ? firstNamesFemale : firstNamesMale);
     const lastName1 = randomElement(lastNames);
     const lastName2 = randomElement(lastNames);
     const province = randomElement([...MOZAMBIQUE_PROVINCES]);
     const districts = MOZAMBIQUE_DISTRICTS[province] || ['Centro'];
     const district = randomElement(districts);
     
     const income = randomInt(5000, 80000);
     const expenses = Math.floor(income * (0.3 + seededRandom() * 0.4));
     
     clients.push({
       id: `client-${i + 1}`,
       fullName: `${firstName} ${lastName1} ${lastName2}`,
       dateOfBirth: randomDate(new Date(1960, 0, 1), new Date(2000, 0, 1)),
       gender: isFemale ? 'F' : 'M',
       phone: generatePhone(),
       email: seededRandom() > 0.6 ? `${firstName.toLowerCase()}.${lastName1.toLowerCase()}@email.co.mz` : undefined,
       address: `Bairro ${randomElement(['Central', 'Alto Maé', 'Polana', 'Sommerschield', 'Costa do Sol', 'Matola', 'Benfica', 'Zimpeto', 'Magoanine', 'Hulene'])}, Rua ${randomInt(1, 50)}`,
       district,
       province,
       biNumber: generateBI(),
       nuit: seededRandom() > 0.3 ? generateNUIT() : undefined,
       employer: randomElement(employers),
       occupation: randomElement(occupations),
       monthlyIncome: income,
       monthlyExpenses: expenses,
       reference1: {
         name: `${randomElement(isFemale ? firstNamesMale : firstNamesFemale)} ${randomElement(lastNames)}`,
         phone: generatePhone(),
         relationship: randomElement(['Cônjuge', 'Irmão(ã)', 'Pai/Mãe', 'Tio(a)', 'Primo(a)', 'Amigo(a)', 'Vizinho(a)']),
       },
       reference2: {
         name: `${randomElement([...firstNamesMale, ...firstNamesFemale])} ${randomElement(lastNames)}`,
         phone: generatePhone(),
         relationship: randomElement(['Colega de trabalho', 'Fornecedor', 'Cliente', 'Vizinho(a)', 'Amigo(a)']),
       },
       notes: seededRandom() > 0.7 ? 'Cliente com bom histórico de pagamento' : undefined,
       status: seededRandom() > 0.95 ? 'pending' : 'active',
       createdAt: randomDate(twoYearsAgo, now) + 'T00:00:00Z',
       updatedAt: new Date().toISOString(),
       createdBy: randomElement(['admin-1', 'analyst-1', 'analyst-2']),
     });
   }
   
   return clients;
 }
 
 // Generate Applications
 function generateApplications(clients: Client[], products: LoanProduct[], count: number): LoanApplication[] {
   const applications: LoanApplication[] = [];
   const statuses: LoanApplication['status'][] = ['draft', 'submitted', 'under_review', 'pending_documents', 'approved', 'rejected', 'cancelled'];
   const analysts = ['analyst-1', 'analyst-2'];
   const now = new Date();
   const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
   
   for (let i = 0; i < count; i++) {
     const client = randomElement(clients);
     const product = randomElement(products);
     const amount = randomInt(product.minAmount, product.maxAmount);
     const term = randomInt(product.minTermMonths, product.maxTermMonths);
     const status = randomElement(statuses);
     const createdAt = randomDate(sixMonthsAgo, now);
     
     const dti = (client.monthlyExpenses / client.monthlyIncome) * 100;
     const paymentCapacity = client.monthlyIncome - client.monthlyExpenses;
     
     let riskLevel: 'low' | 'medium' | 'high' = 'medium';
     if (dti < 30 && paymentCapacity > amount / term * 1.5) riskLevel = 'low';
     else if (dti > 50 || paymentCapacity < amount / term) riskLevel = 'high';
     
     const app: LoanApplication = {
       id: `app-${i + 1}`,
       clientId: client.id,
       productId: product.id,
       requestedAmount: amount,
       termMonths: term,
       interestRate: product.defaultInterestRate,
       adminFee: amount * (product.adminFeeRate / 100),
       purpose: randomElement([...LOAN_PURPOSES]),
       guaranteeType: randomElement([...GUARANTEE_TYPES]),
       guaranteeDescription: seededRandom() > 0.5 ? 'Descrição da garantia' : undefined,
       guarantorName: seededRandom() > 0.6 ? `${randomElement(firstNamesMale)} ${randomElement(lastNames)}` : undefined,
       guarantorPhone: seededRandom() > 0.6 ? generatePhone() : undefined,
       dti: Math.round(dti * 100) / 100,
       paymentCapacity,
       riskLevel,
       creditScore: randomInt(300, 850),
       status,
       submittedAt: status !== 'draft' ? createdAt + 'T10:00:00Z' : undefined,
       reviewedAt: ['approved', 'rejected'].includes(status) ? createdAt + 'T14:00:00Z' : undefined,
       reviewedBy: ['approved', 'rejected'].includes(status) ? randomElement(analysts) : undefined,
       rejectionReason: status === 'rejected' ? randomElement(['Rendimento insuficiente', 'Histórico negativo', 'Documentação incompleta', 'Capacidade de pagamento baixa']) : undefined,
       approvalConditions: status === 'approved' ? randomElement(['Apresentar fiador', 'Comprovar rendimento adicional', 'Sem condições especiais']) : undefined,
       approvedAmount: status === 'approved' ? amount : undefined,
       createdAt: createdAt + 'T00:00:00Z',
       updatedAt: new Date().toISOString(),
       createdBy: randomElement(['admin-1', 'analyst-1', 'analyst-2']),
       assignedAnalyst: randomElement(analysts),
       comments: [],
        documents: [
          { id: 'doc-1', name: 'Bilhete de Identidade', type: 'identification', required: true, uploaded: seededRandom() > 0.2, uploadedAt: new Date().toISOString(), fileName: 'bi_scan.pdf', fileSize: 245000, verified: seededRandom() > 0.3, verifiedBy: 'analyst-1' },
          { id: 'doc-2', name: 'Comprovativo de Residência', type: 'address', required: true, uploaded: seededRandom() > 0.3, uploadedAt: new Date().toISOString(), fileName: 'residencia.jpg', fileSize: 180000, verified: seededRandom() > 0.4 },
          { id: 'doc-3', name: 'Comprovativo de Rendimento', type: 'income', required: true, uploaded: seededRandom() > 0.4, uploadedAt: new Date().toISOString(), fileName: 'rendimento.pdf', fileSize: 320000, verified: seededRandom() > 0.5 },
        ],
     };
     
     applications.push(app);
   }
   
   return applications;
 }
 
 // Generate Loans and related data
 function generateLoansAndPayments(
   applications: LoanApplication[],
   products: LoanProduct[]
 ): { contracts: Contract[]; loans: Loan[]; payments: Payment[]; disbursements: Disbursement[] } {
   const contracts: Contract[] = [];
   const loans: Loan[] = [];
   const payments: Payment[] = [];
   const disbursements: Disbursement[] = [];
   
   const approvedApps = applications.filter(a => a.status === 'approved');
   const now = new Date();
   
   let contractNum = 1;
   let loanNum = 1;
   let paymentNum = 1;
   
   approvedApps.forEach((app, index) => {
     const product = products.find(p => p.id === app.productId)!;
     const amount = app.approvedAmount || app.requestedAmount;
     const term = app.termMonths;
     const monthlyRate = app.interestRate / 100;
     
     const schedule = calcService.calculateAmortizationSchedule(amount, monthlyRate, term);
     const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
     const monthlyPayment = schedule[0]?.totalAmount || 0;
     const adminFee = amount * (product.adminFeeRate / 100);
     
     // Create Contract
     const contract: Contract = {
       id: `contract-${index + 1}`,
       applicationId: app.id,
       clientId: app.clientId,
       contractNumber: `CTR-2024-${String(contractNum++).padStart(5, '0')}`,
       principalAmount: amount,
       interestRate: app.interestRate,
       termMonths: term,
       monthlyPayment,
       totalInterest,
       totalAmount: amount + totalInterest,
       adminFee,
       netDisbursement: amount - adminFee,
       status: seededRandom() > 0.1 ? 'signed' : 'pending_signature',
       signedAt: seededRandom() > 0.1 ? app.reviewedAt : undefined,
       createdAt: app.reviewedAt || app.createdAt,
     };
     contracts.push(contract);
     
     // Only create loan if contract is signed
     if (contract.status === 'signed' && seededRandom() > 0.15) {
       const disbursedAt = new Date(contract.createdAt);
       disbursedAt.setDate(disbursedAt.getDate() + randomInt(1, 5));
       
       // Calculate how many payments should have been made
       const monthsSinceDisbursement = Math.floor((now.getTime() - disbursedAt.getTime()) / (30 * 24 * 60 * 60 * 1000));
       const expectedPayments = Math.min(monthsSinceDisbursement, term);
       const actualPayments = Math.floor(expectedPayments * (0.7 + seededRandom() * 0.3));
       
       let outstandingPrincipal = amount;
       let outstandingInterest = 0;
       let totalPaid = 0;
       
       // Generate payment schedule with status
       const loanSchedule: PaymentScheduleItem[] = schedule.map((item, idx) => {
         const dueDate = new Date(disbursedAt);
         dueDate.setMonth(dueDate.getMonth() + idx + 1);
         
         const isPaid = idx < actualPayments;
         const isOverdue = !isPaid && dueDate < now;
         
         return {
           ...item,
           dueDate: dueDate.toISOString().split('T')[0],
           status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
           paidAmount: isPaid ? item.totalAmount : 0,
           paidAt: isPaid ? dueDate.toISOString() : undefined,
         };
       });
       
       // Update outstanding amounts based on payments
       for (let i = 0; i < actualPayments; i++) {
         outstandingPrincipal -= loanSchedule[i].principal;
         totalPaid += loanSchedule[i].totalAmount;
       }
       
       // Calculate days overdue
       let daysOverdue = 0;
       const firstOverdue = loanSchedule.find(s => s.status === 'overdue');
       if (firstOverdue) {
         daysOverdue = Math.floor((now.getTime() - new Date(firstOverdue.dueDate).getTime()) / (24 * 60 * 60 * 1000));
       }
       
       const loanStatus: Loan['status'] = 
         actualPayments >= term ? 'paid_off' :
         daysOverdue > 0 ? 'overdue' : 'active';
       
       const loan: Loan = {
         id: `loan-${loanNum}`,
         contractId: contract.id,
         clientId: app.clientId,
         applicationId: app.id,
         loanNumber: `EMP-2024-${String(loanNum++).padStart(5, '0')}`,
         principalAmount: amount,
         interestRate: app.interestRate,
         termMonths: term,
         monthlyPayment,
         disbursedAmount: contract.netDisbursement,
         disbursedAt: disbursedAt.toISOString(),
         disbursementMethod: randomElement(['cash', 'mpesa', 'bank_transfer']) as PaymentMethod,
         disbursementReference: `REF-${randomInt(100000, 999999)}`,
         status: loanStatus,
         outstandingPrincipal: Math.max(0, outstandingPrincipal),
         outstandingInterest,
         totalPaid,
         daysOverdue,
         nextPaymentDate: loanSchedule.find(s => s.status === 'pending')?.dueDate,
         nextPaymentAmount: loanSchedule.find(s => s.status === 'pending')?.totalAmount,
         lastPaymentDate: actualPayments > 0 ? loanSchedule[actualPayments - 1].paidAt : undefined,
         paidOffAt: loanStatus === 'paid_off' ? loanSchedule[term - 1].paidAt : undefined,
         analystId: app.assignedAnalyst || 'analyst-1',
         cashierId: 'cashier-1',
         createdAt: disbursedAt.toISOString(),
         updatedAt: now.toISOString(),
         schedule: loanSchedule,
       };
       loans.push(loan);
       
       // Create disbursement record
       disbursements.push({
         id: `disb-${index + 1}`,
         loanId: loan.id,
         contractId: contract.id,
         clientId: app.clientId,
         grossAmount: amount,
         adminFee,
         netAmount: contract.netDisbursement,
         method: loan.disbursementMethod as PaymentMethod,
         reference: loan.disbursementReference,
         disbursedAt: loan.disbursedAt!,
         processedBy: 'cashier-1',
       });
       
       // Create payment records
       for (let i = 0; i < actualPayments; i++) {
         const scheduleItem = loanSchedule[i];
         payments.push({
           id: `pmt-${paymentNum}`,
           loanId: loan.id,
           clientId: app.clientId,
           amount: scheduleItem.totalAmount,
           principalPaid: scheduleItem.principal,
           interestPaid: scheduleItem.interest,
           penaltyPaid: 0,
           paymentMethod: randomElement(['cash', 'mpesa', 'emola', 'bank_transfer']) as PaymentMethod,
           reference: `PAG-${randomInt(100000, 999999)}`,
           receiptNumber: `REC-2024-${String(paymentNum++).padStart(6, '0')}`,
           paymentDate: scheduleItem.paidAt!.split('T')[0],
           processedAt: scheduleItem.paidAt!,
           processedBy: 'cashier-1',
           reversed: false,
         });
       }
     }
   });
   
   return { contracts, loans, payments, disbursements };
 }
 
 // Initialize all mock data
 export function initializeMockData(): void {
   if (storageService.isInitialized()) {
     return;
   }
   
   console.log('Initializing mock data...');
   
   // Reset seed for consistent generation
   seed = 12345;
   
   const users = generateUsers();
   const products = generateLoanProducts();
   const clients = generateClients(50);
   const applications = generateApplications(clients, products, 80);
   const { contracts, loans, payments, disbursements } = generateLoansAndPayments(applications, products);
   
   // Store all data
   storageService.setAll('users', users);
   storageService.setAll('loanProducts', products);
   storageService.setAll('clients', clients);
   storageService.setAll('applications', applications);
   storageService.setAll('contracts', contracts);
   storageService.setAll('loans', loans);
   storageService.setAll('payments', payments);
   storageService.setAll('disbursements', disbursements);
   storageService.setAll('collectionTasks', []);
   storageService.setAll('collectionInteractions', []);
   storageService.setAll('auditLogs', []);
   
   storageService.setInitialized(true);
   
   console.log('Mock data initialized:', {
     users: users.length,
     products: products.length,
     clients: clients.length,
     applications: applications.length,
     contracts: contracts.length,
     loans: loans.length,
     payments: payments.length,
     disbursements: disbursements.length,
   });
 }
 
 export function resetMockData(): void {
   storageService.reset();
   initializeMockData();
 }