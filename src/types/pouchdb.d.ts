declare namespace PouchDB {
  interface Database {
    put(doc: any): Promise<any>;
    get(id: string): Promise<any>;
    remove(doc: any): Promise<any>;
    allDocs(options?: any): Promise<any>;
    find(options: any): Promise<any>;
    createIndex(options: any): Promise<any>;
    info(): Promise<any>;
    compact(): Promise<void>;
    destroy(): Promise<void>;
    close(): Promise<void>;
    sync(target: Database, options?: any): any;
    replicate: {
      to(target: Database): Promise<any>;
      from(target: Database): Promise<any>;
    };
    bulkDocs(docs: any[]): Promise<any>;
    getAttachment(docId: string, attachmentId: string): Promise<Blob>;
    putAttachment(docId: string, attachmentId: string, attachment: Blob, type: string): Promise<any>;
    removeAttachment(docId: string, attachmentId: string, rev: string): Promise<any>;
    name?: string;
  }

  namespace Configuration {
    interface DatabaseConfiguration {
      adapter?: string;
      auth?: {
        username: string;
        password: string;
      };
      skip_setup?: boolean;
    }
  }

  namespace Core {
    interface Error {
      status?: number;
      message?: string;
      error?: boolean;
      reason?: string;
    }

    interface Document<T> {
      _id?: string;
      _rev?: string;
      [key: string]: any;
    }

    interface ExistingDocument<T> extends Document<T> {
      _id: string;
      _rev: string;
    }
  }

  namespace Replication {
    interface SyncResult<T> {
      direction?: string;
      change?: {
        docs: T[];
      };
    }

    interface Sync<T> {
      on(event: string, handler: Function): Sync<T>;
      cancel(): void;
    }
  }
}

declare const PouchDB: new(name: string, options?: PouchDB.Configuration.DatabaseConfiguration) => PouchDB.Database;