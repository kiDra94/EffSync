import { Injectable, NotFoundException } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { unlink } from "fs/promises";
import { isAbsolute, resolve } from "path";
import type { Readable } from "stream";
import { DocumentStorage } from "../application/ports/document-storage";

/** Document files under UPLOAD_DIR on the local disk (uploads before the blobs). */
@Injectable()
export class LocalDocumentStorage extends DocumentStorage {
  private uploadRoot() {
    return resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");
  }

  private resolvePath(filePath?: string | null) {
    if (!filePath) {
      throw new NotFoundException("Datei zum Dokument wurde nicht gefunden");
    }
    if (isAbsolute(filePath)) return filePath;
    const sanitizedPath = filePath.replace(/^\.\/?/, "");
    if (sanitizedPath.startsWith("uploads/")) {
      return resolve(process.cwd(), sanitizedPath);
    }
    return resolve(this.uploadRoot(), sanitizedPath);
  }

  open(filePath: string | null | undefined): Readable {
    const resolvedPath = this.resolvePath(filePath);
    if (!existsSync(resolvedPath)) {
      throw new NotFoundException("Datei zum Dokument wurde nicht gefunden");
    }
    return createReadStream(resolvedPath);
  }

  async remove(filePath: string) {
    const resolvedPath = this.resolvePath(filePath);
    if (existsSync(resolvedPath)) {
      await unlink(resolvedPath).catch(() => undefined);
    }
  }
}
