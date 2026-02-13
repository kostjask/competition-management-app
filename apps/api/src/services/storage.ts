/**
 * Storage Service Interface
 * 
 * Abstraction for file storage operations. Allows easy switching between
 * local storage and cloud services (AWS S3, etc.) without changing business logic.
 */

export interface StorageProvider {
  /**
   * Upload a file and return the public URL
   * @param file - File buffer and metadata
   * @param directory - Storage directory (e.g., "events", "judges", "dancers")
   * @param filename - Desired filename
   * @returns Public URL to access the file
   */
  uploadFile(
    file: { buffer: Buffer; mimetype: string },
    directory: string,
    filename: string,
  ): Promise<string>;

  /**
   * Delete a file or resource
   * @param path - File path or storage key
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Get the public URL for a stored file
   * @param path - File path or storage key
   * @returns Public URL
   */
  getFileUrl(path: string): string;
}

let storageProvider: StorageProvider;

export function setStorageProvider(provider: StorageProvider): void {
  storageProvider = provider;
}

export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    throw new Error(
      "Storage provider not initialized. Call setStorageProvider() first.",
    );
  }
  return storageProvider;
}

export async function uploadFile(
  file: { buffer: Buffer; mimetype: string },
  directory: string,
  filename: string,
): Promise<string> {
  return getStorageProvider().uploadFile(file, directory, filename);
}

export async function deleteFile(path: string): Promise<void> {
  return getStorageProvider().deleteFile(path);
}

export function getFileUrl(path: string): string {
  return getStorageProvider().getFileUrl(path);
}
