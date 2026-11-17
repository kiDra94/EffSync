import type { Readable } from "stream";

/**
 * Files of documents stored on disk before blobs (port; the local file
 * system in infrastructure). New uploads are stored as blobs.
 */
export abstract class DocumentStorage {
  /** The stored file; 404 if there is none or it is missing. */
  abstract open(filePath: string | null | undefined): Readable;
  /** Removes the stored file if it still exists. */
  abstract remove(filePath: string): Promise<void>;
}
