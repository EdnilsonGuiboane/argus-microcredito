 // Storage Service - Handles all localStorage operations with versioning
 
 const STORAGE_KEY = 'microcredito_v1';
 
 interface StorageData {
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
   session: any | null;
   preferences: {
     theme: 'light' | 'dark';
     sidebarCollapsed: boolean;
     savedFilters: Record<string, any>;
   };
 }
 
 const defaultData: StorageData = {
   version: 1,
   initialized: false,
   lastUpdated: new Date().toISOString(),
   data: {
     users: [],
     clients: [],
     loanProducts: [],
     applications: [],
     contracts: [],
     loans: [],
     payments: [],
     disbursements: [],
     collectionTasks: [],
     collectionInteractions: [],
     auditLogs: [],
   },
   session: null,
   preferences: {
     theme: 'light',
     sidebarCollapsed: false,
     savedFilters: {},
   },
 };
 
 class StorageService {
   private getStorage(): StorageData {
     try {
       const stored = localStorage.getItem(STORAGE_KEY);
       if (stored) {
         return JSON.parse(stored);
       }
     } catch (error) {
       console.error('Error reading from localStorage:', error);
     }
     return { ...defaultData };
   }
 
   private setStorage(data: StorageData): void {
     try {
       data.lastUpdated = new Date().toISOString();
       localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
     } catch (error) {
       console.error('Error writing to localStorage:', error);
     }
   }
 
   isInitialized(): boolean {
     return this.getStorage().initialized;
   }
 
   setInitialized(value: boolean): void {
     const storage = this.getStorage();
     storage.initialized = value;
     this.setStorage(storage);
   }
 
   // Generic CRUD operations
   getAll<T>(entity: keyof StorageData['data']): T[] {
     return this.getStorage().data[entity] as T[];
   }
 
   getById<T extends { id: string }>(entity: keyof StorageData['data'], id: string): T | undefined {
     return (this.getStorage().data[entity] as T[]).find(item => item.id === id);
   }
 
   create<T extends { id: string }>(entity: keyof StorageData['data'], item: T): T {
     const storage = this.getStorage();
     (storage.data[entity] as T[]).push(item);
     this.setStorage(storage);
     return item;
   }
 
  update(entity: keyof StorageData['data'], id: string, updates: Record<string, any>): any {
    const storage = this.getStorage();
    const items = storage.data[entity] as { id: string }[];
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.setStorage(storage);
      return items[index];
    }
    return undefined;
  }
 
   delete(entity: keyof StorageData['data'], id: string): boolean {
     const storage = this.getStorage();
     const items = storage.data[entity] as { id: string }[];
     const index = items.findIndex(item => item.id === id);
     if (index !== -1) {
       items.splice(index, 1);
       this.setStorage(storage);
       return true;
     }
     return false;
   }
 
   setAll<T>(entity: keyof StorageData['data'], items: T[]): void {
     const storage = this.getStorage();
     storage.data[entity] = items as any;
     this.setStorage(storage);
   }
 
   // Session management
   getSession(): any | null {
     return this.getStorage().session;
   }
 
   setSession(session: any | null): void {
     const storage = this.getStorage();
     storage.session = session;
     this.setStorage(storage);
   }
 
   clearSession(): void {
     this.setSession(null);
   }
 
   // Preferences
   getPreferences(): StorageData['preferences'] {
     return this.getStorage().preferences;
   }
 
   setPreference<K extends keyof StorageData['preferences']>(key: K, value: StorageData['preferences'][K]): void {
     const storage = this.getStorage();
     storage.preferences[key] = value;
     this.setStorage(storage);
   }
 
   getTheme(): 'light' | 'dark' {
     return this.getPreferences().theme;
   }
 
   setTheme(theme: 'light' | 'dark'): void {
     this.setPreference('theme', theme);
   }
 
   // Reset all data
   reset(): void {
     localStorage.removeItem(STORAGE_KEY);
   }
 }
 
 export const storageService = new StorageService();