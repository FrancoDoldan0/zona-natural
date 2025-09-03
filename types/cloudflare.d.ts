// types/cloudflare.d.ts
export {};

declare global {
  interface R2Object {
    key: string;
    size: number;
    etag: string;
    uploaded: string | Date;
    customMetadata?: Record<string, string>;
  }
  interface R2ListResponse {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  }
  interface R2Bucket {
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string, options?: any): Promise<any>;
    get(key: string, options?: any): Promise<any>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; cursor?: string; delimiter?: string; limit?: number }): Promise<R2ListResponse>;
  }
  interface Env {
    R2: R2Bucket;
    PUBLIC_R2_BASE_URL?: string; // ej: https://cdn.tu-dominio.com
  }
}
