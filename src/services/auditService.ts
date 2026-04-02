 // Audit Service - Track user actions
 
 import { AuditLog } from '@/models/types';
 import { storageService } from './storageService';
 
 class AuditService {
   log(
     userId: string,
     userName: string,
     action: string,
     entity: string,
     entityId: string,
     details?: string
   ): void {
     const entry: AuditLog = {
       id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
       userId,
       userName,
       action,
       entity,
       entityId,
       details,
       timestamp: new Date().toISOString(),
     };
     
     storageService.create('auditLogs', entry);
   }
 
   getAll(): AuditLog[] {
     return storageService.getAll<AuditLog>('auditLogs').sort(
       (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
     );
   }
 
   getByEntity(entity: string, entityId: string): AuditLog[] {
     return this.getAll().filter(
       log => log.entity === entity && log.entityId === entityId
     );
   }
 
   getByUser(userId: string): AuditLog[] {
     return this.getAll().filter(log => log.userId === userId);
   }
 
   getRecent(limit: number = 50): AuditLog[] {
     return this.getAll().slice(0, limit);
   }
 }
 
 export const auditService = new AuditService();