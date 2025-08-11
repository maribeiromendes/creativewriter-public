import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  WriteBatch,
  writeBatch
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData, docData } from 'rxfire/firestore';

export interface FirestoreDocument {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueryOptions {
  where?: {
    field: string;
    operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: unknown;
  }[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);

  private convertTimestamps(data: DocumentData): DocumentData {
    const converted = { ...data };
    
    // Convert Firestore Timestamps to JavaScript Dates
    Object.keys(converted).forEach(key => {
      const value = converted[key];
      if (value && typeof value === 'object' && value.toDate) {
        converted[key] = value.toDate();
      } else if (Array.isArray(value)) {
        converted[key] = value.map(item => 
          item && typeof item === 'object' && item.toDate ? item.toDate() : item
        );
      } else if (value && typeof value === 'object') {
        converted[key] = this.convertTimestamps(value);
      }
    });
    
    return converted;
  }

  private buildQuery(collectionRef: unknown, options?: QueryOptions): unknown {
    if (!options) return collectionRef;

    const constraints: QueryConstraint[] = [];

    if (options.where) {
      options.where.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }

    if (options.orderBy) {
      options.orderBy.forEach(order => {
        constraints.push(orderBy(order.field, order.direction));
      });
    }

    if (options.limit) {
      constraints.push(firestoreLimit(options.limit));
    }

    return query(collectionRef as Parameters<typeof query>[0], ...constraints);
  }

  async create<T extends FirestoreDocument>(
    collectionName: string, 
    data: Omit<T, 'id'>, 
    customId?: string
  ): Promise<T> {
    const collectionRef = collection(this.firestore, collectionName);
    const timestamp = new Date();
    const docData = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (customId) {
      const docRef = doc(collectionRef, customId);
      await setDoc(docRef, docData);
      return { ...docData, id: customId } as T;
    } else {
      const docRef = await addDoc(collectionRef, docData);
      return { ...docData, id: docRef.id } as T;
    }
  }

  async get<T extends FirestoreDocument>(
    collectionName: string, 
    id: string
  ): Promise<T | null> {
    const docRef = doc(this.firestore, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = this.convertTimestamps(docSnap.data());
      return { ...data, id: docSnap.id } as T;
    }
    
    return null;
  }

  async getAll<T extends FirestoreDocument>(
    collectionName: string, 
    options?: QueryOptions
  ): Promise<T[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const queryRef = this.buildQuery(collectionRef, options);
    const querySnapshot = await getDocs(queryRef as Parameters<typeof getDocs>[0]);
    
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<unknown, DocumentData>) => {
      const data = this.convertTimestamps(doc.data() as DocumentData);
      return { ...data, id: doc.id } as T;
    });
  }

  async update<T extends FirestoreDocument>(
    collectionName: string, 
    id: string, 
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<void> {
    const docRef = doc(this.firestore, collectionName, id);
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    await updateDoc(docRef, updateData);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    const docRef = doc(this.firestore, collectionName, id);
    await deleteDoc(docRef);
  }

  // Observable methods for real-time updates
  getObservable<T extends FirestoreDocument>(
    collectionName: string, 
    id: string
  ): Observable<T | null> {
    const docRef = doc(this.firestore, collectionName, id);
    return docData(docRef).pipe(
      map(data => data ? { ...this.convertTimestamps(data), id } as T : null)
    );
  }

  getAllObservable<T extends FirestoreDocument>(
    collectionName: string, 
    options?: QueryOptions
  ): Observable<T[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const queryRef = this.buildQuery(collectionRef, options);
    
    return collectionData(queryRef as Parameters<typeof collectionData>[0]).pipe(
      map(docs => docs.map(doc => this.convertTimestamps(doc) as T))
    );
  }

  // Batch operations
  createBatch(): WriteBatch {
    return writeBatch(this.firestore);
  }

  async executeBatch(batch: WriteBatch): Promise<void> {
    await batch.commit();
  }

  // Bulk operations
  async createMany<T extends FirestoreDocument>(
    collectionName: string, 
    items: Omit<T, 'id'>[]
  ): Promise<T[]> {
    const batch = this.createBatch();
    const collectionRef = collection(this.firestore, collectionName);
    const results: T[] = [];
    const timestamp = new Date();

    items.forEach(item => {
      const docRef = doc(collectionRef);
      const docData = {
        ...item,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      batch.set(docRef, docData);
      results.push({ ...docData, id: docRef.id } as T);
    });

    await this.executeBatch(batch);
    return results;
  }

  async updateMany<T extends FirestoreDocument>(
    collectionName: string, 
    updates: { id: string; data: Partial<Omit<T, 'id' | 'createdAt'>> }[]
  ): Promise<void> {
    const batch = this.createBatch();
    const timestamp = new Date();

    updates.forEach(update => {
      const docRef = doc(this.firestore, collectionName, update.id);
      const updateData = {
        ...update.data,
        updatedAt: timestamp
      };
      batch.update(docRef, updateData);
    });

    await this.executeBatch(batch);
  }

  async deleteMany(collectionName: string, ids: string[]): Promise<void> {
    const batch = this.createBatch();

    ids.forEach(id => {
      const docRef = doc(this.firestore, collectionName, id);
      batch.delete(docRef);
    });

    await this.executeBatch(batch);
  }
}