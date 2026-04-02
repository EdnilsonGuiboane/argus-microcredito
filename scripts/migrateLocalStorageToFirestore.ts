/**
 * =============================================================================
 * SCRIPT DE MIGRAÇÃO: localStorage → Firebase Firestore
 * =============================================================================
 * 
 * Este script é apenas REFERÊNCIA. Não está integrado à aplicação.
 * 
 * COMO USAR:
 * 1. Exportar os dados do localStorage via DevTools do browser:
 *    - Abrir DevTools (F12)
 *    - Ir à aba Console
 *    - Executar: copy(localStorage.getItem('microcredito_v1'))
 *    - Colar num ficheiro JSON (ex: localStorage-export.json)
 * 
 * 2. Configurar as credenciais Firebase:
 *    - Criar ficheiro .env com as variáveis FIREBASE_*
 *    - Ou editar directamente serviceAccount abaixo
 * 
 * 3. Executar o script:
 *    npx ts-node scripts/migrateLocalStorageToFirestore.ts ./localStorage-export.json
 * 
 * DEPENDÊNCIAS:
 *    npm install firebase-admin
 * 
 * =============================================================================
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURAÇÃO FIREBASE (editar conforme necessário)
// =============================================================================

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'microloan-hub-prod',
  // Para produção, usar ficheiro de credenciais:
  // const serviceAccount = require('./serviceAccountKey.json');
};

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: serviceAccount.projectId,
});

const db = admin.firestore();

// =============================================================================
// TIPOS (espelhar src/models/types.ts)
// =============================================================================

interface LocalStorageData {
  version: number;
  initialized: boolean;
  lastUpdated: string;
  data: {
    users: any[];
    clients: any[];
    loanProducts: any[];
    applications: any[];
    contracts: any[];
    loans: any[];
    payments: any[];
    disbursements: any[];
    collectionTasks: any[];
    collectionInteractions: any[];
    auditLogs: any[];
  };
}

interface MigrationResult {
  collection: string;
  total: number;
  migrated: number;
  errors: string[];
}

// =============================================================================
// FUNÇÕES DE VALIDAÇÃO
// =============================================================================

function validateSchema(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.version) {
    errors.push('Campo "version" em falta');
  }
  
  if (!data.data) {
    errors.push('Campo "data" em falta');
  }
  
  const requiredCollections = [
    'users', 'clients', 'loanProducts', 'applications', 
    'contracts', 'loans', 'payments', 'disbursements'
  ];
  
  for (const col of requiredCollections) {
    if (!data.data[col]) {
      errors.push(`Coleção "${col}" em falta`);
    } else if (!Array.isArray(data.data[col])) {
      errors.push(`Coleção "${col}" deve ser um array`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function validateClient(client: any): string[] {
  const errors: string[] = [];
  if (!client.id) errors.push('id em falta');
  if (!client.fullName) errors.push('fullName em falta');
  if (!client.biNumber) errors.push('biNumber em falta');
  if (!client.phone) errors.push('phone em falta');
  return errors;
}

function validateLoan(loan: any): string[] {
  const errors: string[] = [];
  if (!loan.id) errors.push('id em falta');
  if (!loan.clientId) errors.push('clientId em falta');
  if (!loan.contractId) errors.push('contractId em falta');
  if (typeof loan.principalAmount !== 'number') errors.push('principalAmount deve ser número');
  return errors;
}

// =============================================================================
// FUNÇÕES DE MIGRAÇÃO
// =============================================================================

async function migrateCollection(
  collectionName: string,
  items: any[],
  validateFn?: (item: any) => string[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: collectionName,
    total: items.length,
    migrated: 0,
    errors: [],
  };
  
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_LIMIT = 500;
  
  for (const item of items) {
    // Validar item
    if (validateFn) {
      const validationErrors = validateFn(item);
      if (validationErrors.length > 0) {
        result.errors.push(`Item ${item.id}: ${validationErrors.join(', ')}`);
        continue;
      }
    }
    
    // Converter datas para Timestamp
    const firestoreItem = convertDates(item);
    
    // Adicionar ao batch
    const docRef = db.collection(collectionName).doc(item.id);
    batch.set(docRef, firestoreItem);
    batchCount++;
    result.migrated++;
    
    // Commit batch se atingir limite
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  // Commit batch restante
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return result;
}

async function migrateLoansWithSubcollections(loans: any[]): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: 'loans',
    total: loans.length,
    migrated: 0,
    errors: [],
  };
  
  for (const loan of loans) {
    const validationErrors = validateLoan(loan);
    if (validationErrors.length > 0) {
      result.errors.push(`Loan ${loan.id}: ${validationErrors.join(', ')}`);
      continue;
    }
    
    try {
      // Separar schedule (subcoleção)
      const { schedule, ...loanData } = loan;
      
      // Criar documento principal
      const loanRef = db.collection('loans').doc(loan.id);
      await loanRef.set(convertDates(loanData));
      
      // Criar subcoleção installments
      if (schedule && Array.isArray(schedule)) {
        const batch = db.batch();
        for (const installment of schedule) {
          const installmentRef = loanRef.collection('installments').doc(`installment-${installment.installmentNumber}`);
          batch.set(installmentRef, convertDates(installment));
        }
        await batch.commit();
      }
      
      result.migrated++;
    } catch (error: any) {
      result.errors.push(`Loan ${loan.id}: ${error.message}`);
    }
  }
  
  return result;
}

function convertDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Verificar se é uma data ISO
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (isoDateRegex.test(obj)) {
      return admin.firestore.Timestamp.fromDate(new Date(obj));
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertDates);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertDates(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================

async function migrate(filePath: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('MIGRAÇÃO localStorage → Firestore');
  console.log('='.repeat(60));
  console.log(`Ficheiro: ${filePath}`);
  console.log(`Projeto Firebase: ${serviceAccount.projectId}`);
  console.log('');
  
  // Ler ficheiro JSON
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Ficheiro não encontrado: ${filePath}`);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  let data: LocalStorageData;
  
  try {
    data = JSON.parse(rawData);
  } catch (error) {
    console.error('❌ Erro ao parsear JSON:', error);
    process.exit(1);
  }
  
  // Validar schema
  console.log('📋 Validando schema...');
  const validation = validateSchema(data);
  if (!validation.valid) {
    console.error('❌ Schema inválido:');
    validation.errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }
  console.log('✅ Schema válido\n');
  
  // Mapear coleções localStorage → Firestore
  const collectionMap: Record<string, string> = {
    users: 'users',
    clients: 'clients',
    loanProducts: 'products',
    applications: 'loan_applications',
    contracts: 'contracts',
    // loans tratados separadamente (subcoleções)
    payments: 'payments',
    disbursements: 'disbursements',
    collectionTasks: 'collection_tasks',
    collectionInteractions: 'collection_actions',
    auditLogs: 'audit_logs',
  };
  
  const results: MigrationResult[] = [];
  
  // Migrar coleções simples
  for (const [localKey, firestoreCol] of Object.entries(collectionMap)) {
    const items = data.data[localKey as keyof typeof data.data];
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log(`⏭️  ${firestoreCol}: vazio, ignorado`);
      continue;
    }
    
    console.log(`📦 Migrando ${firestoreCol}...`);
    const validateFn = localKey === 'clients' ? validateClient : undefined;
    const result = await migrateCollection(firestoreCol, items, validateFn);
    results.push(result);
    console.log(`   ✅ ${result.migrated}/${result.total} migrados`);
    if (result.errors.length > 0) {
      console.log(`   ⚠️  ${result.errors.length} erros`);
    }
  }
  
  // Migrar loans com subcoleções
  if (data.data.loans && data.data.loans.length > 0) {
    console.log(`📦 Migrando loans (com subcoleções)...`);
    const loanResult = await migrateLoansWithSubcollections(data.data.loans);
    results.push(loanResult);
    console.log(`   ✅ ${loanResult.migrated}/${loanResult.total} migrados`);
  }
  
  // Criar log de auditoria da migração
  console.log('\n📝 Criando log de auditoria...');
  const migrationLog = {
    id: `audit-migration-${Date.now()}`,
    userId: 'system',
    userName: 'Migration Script',
    action: 'MIGRATION_IMPORT',
    entity: 'system',
    entityId: 'migration',
    details: JSON.stringify({
      source: 'localStorage',
      version: data.version,
      results: results.map(r => ({
        collection: r.collection,
        migrated: r.migrated,
        errors: r.errors.length,
      })),
    }),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('audit_logs').doc(migrationLog.id).set(migrationLog);
  console.log('✅ Log de auditoria criado\n');
  
  // Resumo final
  console.log('='.repeat(60));
  console.log('RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  
  let totalMigrated = 0;
  let totalErrors = 0;
  
  for (const result of results) {
    totalMigrated += result.migrated;
    totalErrors += result.errors.length;
    console.log(`${result.collection}: ${result.migrated}/${result.total}`);
    if (result.errors.length > 0) {
      result.errors.forEach(e => console.log(`   ⚠️  ${e}`));
    }
  }
  
  console.log('');
  console.log(`Total migrado: ${totalMigrated}`);
  console.log(`Total erros: ${totalErrors}`);
  console.log('');
  
  if (totalErrors === 0) {
    console.log('✅ Migração concluída com sucesso!');
  } else {
    console.log('⚠️  Migração concluída com erros. Verifique os logs.');
  }
}

// =============================================================================
// EXECUÇÃO
// =============================================================================

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: npx ts-node scripts/migrateLocalStorageToFirestore.ts <ficheiro.json>');
  console.log('');
  console.log('Exemplo:');
  console.log('  npx ts-node scripts/migrateLocalStorageToFirestore.ts ./localStorage-export.json');
  process.exit(1);
}

migrate(args[0]).catch(console.error);
