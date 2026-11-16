import { CmsIndexSchema, CmsDocumentSchema, CmsReceiptSchema, CmsPreviewSchema, CmsRevisionSchema } from "@dance/schemas";
import { apiClient, decode } from "./client";
export const contentApi = {
  index: async () => decode(CmsIndexSchema, await apiClient.get("/content/documents", { cache: "no-store" })),
  detail: async (id: string) => decode(CmsDocumentSchema, await apiClient.get(`/content/documents/${id}`, { cache: "no-store" })),
  command: async (path: string, body: unknown) => decode(CmsReceiptSchema, await apiClient.post(`/content/${path}`, body)),
  receipt: async (id: string, operation: string) => decode(CmsReceiptSchema, await apiClient.get(`/content/documents/${id}/operations/${operation}`, { cache: "no-store" })),
  preview: async (id: string, revision: string, locale: string) => decode(CmsPreviewSchema, await apiClient.get(`/content/documents/${id}/preview?revisionId=${revision}&locale=${locale}`, { cache: "no-store" })),
  history: async (id: string, before?: number) => decode(CmsRevisionSchema.array(), await apiClient.get(`/content/documents/${id}/revisions${before ? `?before=${before}` : ""}`, { cache: "no-store" })),
  upload: async (id: string, file: File, operationId: string, version: number) => {
    const form = new FormData(); form.set("image", file);
    return decode(CmsReceiptSchema, await apiClient.upload(`/content/documents/${id}/assets`, form, { "X-Content-Operation": operationId, "X-Content-Version": String(version) }));
  },
};
