import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Contact,
  LedgerEntry,
  PurchaseRecord,
  GoldStockMovement,
  CurrencyStockMovement,
  Partner,
  Partnership,
  PartnershipLoan,
  PurchaseFormulaConfig,
} from '../types';

export const FirebaseSyncService = {
  // Save entire purchase
  async savePurchase(purchase: PurchaseRecord): Promise<void> {
    try {
      await setDoc(doc(db, 'purchases', purchase.id), {
        ...purchase,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Firebase savePurchase fallback to local:', error);
    }
  },

  // Save stock movement
  async saveStockMovement(movement: GoldStockMovement): Promise<void> {
    try {
      await setDoc(doc(db, 'stock_movements', movement.id), {
        ...movement,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Firebase saveStockMovement fallback to local:', error);
    }
  },

  // Save sale record
  async saveSaleRecord(saleDoc: {
    id: string;
    description: string;
    profit: number;
    revenue: number;
    weightGrams: number;
    karat: string;
    category?: string;
    targetAccount?: string;
    date: string;
  }): Promise<void> {
    try {
      await setDoc(doc(db, 'sales', saleDoc.id), {
        ...saleDoc,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Firebase saveSaleRecord fallback to local:', error);
    }
  },

  // Save bank accounts / caisse state
  async saveBankBalances(balances: Record<string, number>): Promise<void> {
    try {
      await setDoc(doc(db, 'accounts', 'main_balances'), {
        balances,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Firebase saveBankBalances fallback to local:', error);
    }
  },

  // Save formula config
  async saveFormulaConfig(config: PurchaseFormulaConfig): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', 'purchase_formula'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Firebase saveFormulaConfig fallback to local:', error);
    }
  },

  // Listen to remote changes
  subscribeToPurchases(onData: (purchases: PurchaseRecord[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'purchases'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: PurchaseRecord[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as PurchaseRecord);
            });
            // Sort by purchasedAt descending
            list.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
            onData(list);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot purchases error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeToStockMovements(onData: (movements: GoldStockMovement[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'stock_movements'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: GoldStockMovement[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as GoldStockMovement);
            });
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            onData(list);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot stock_movements error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeToAccounts(onData: (balances: Record<string, number>) => void): () => void {
    try {
      return onSnapshot(
        doc(db, 'accounts', 'main_balances'),
        (docSnap) => {
          if (docSnap.exists() && docSnap.data().balances) {
            onData(docSnap.data().balances);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot accounts error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeToFormulaConfig(onData: (config: PurchaseFormulaConfig) => void): () => void {
    try {
      return onSnapshot(
        doc(db, 'settings', 'purchase_formula'),
        (docSnap) => {
          if (docSnap.exists()) {
            onData(docSnap.data() as PurchaseFormulaConfig);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot settings error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  async saveContact(contact: any) {
    try {
      const id = contact.id || contact.reference;
      if (!id) return;
      await setDoc(doc(db, 'contacts', id), JSON.parse(JSON.stringify(contact)), { merge: true });
    } catch (e) {
      console.error('Firestore saveContact error:', e);
    }
  },

  subscribeContacts(onUpdate: (items: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'contacts'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          onUpdate(items);
        },
        (error) => {
          console.warn('Firestore onSnapshot contacts error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  async saveOperation(operation: any) {
    try {
      const id = operation.id;
      if (!id) return;
      await setDoc(doc(db, 'operations', id), JSON.parse(JSON.stringify(operation)), { merge: true });
    } catch (e) {
      console.error('Firestore saveOperation error:', e);
    }
  },

  subscribeOperations(onUpdate: (items: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'operations'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          onUpdate(items);
        },
        (error) => {
          console.warn('Firestore onSnapshot operations error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeSaleRecords(onUpdate: (items: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'sales'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          onUpdate(items);
        },
        (error) => {
          console.warn('Firestore onSnapshot sales error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  async saveTask(task: any) {
    try {
      const id = task.id;
      if (!id) return;
      await setDoc(doc(db, 'tasks', id), JSON.parse(JSON.stringify(task)), { merge: true });
    } catch (e) {
      console.error('Firestore saveTask error:', e);
    }
  },

  subscribeTasks(onUpdate: (items: any[]) => void) {
    try {
      return onSnapshot(
        collection(db, 'tasks'),
        (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          onUpdate(items);
        },
        (error) => {
          console.warn('Firestore onSnapshot tasks error:', error);
        }
      );
    } catch (e) {
      return () => {};
    }
  },
};
