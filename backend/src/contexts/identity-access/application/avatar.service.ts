import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FileInspector } from "../../../shared/application/file-inspector";
import { profilePictureUrl } from "../../../shared/application/profile-picture";
import { isAvatarType, MAX_AVATAR_BYTES } from "../domain/avatar";
import { AvatarRepository } from "./ports/avatar.repository";

/**
 * The profile picture (T47, decision Q8c, M27): an image of at most 1 MB,
 * recognized by its content, not by the name or the declared type.
 */
@Injectable()
export class AvatarService {
  constructor(
    private readonly avatars: AvatarRepository,
    private readonly files: FileInspector,
  ) {}

  async save(userId: number, content: Buffer) {
    if (content.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException(
        "Das Profilbild darf höchstens 1 MB groß sein",
      );
    }
    const mimeType = this.files.detectMime(content);
    if (!isAvatarType(mimeType)) {
      throw new BadRequestException(
        "Als Profilbild sind nur PNG, JPEG, GIF, WebP und BMP erlaubt",
      );
    }
    const updated_at = await this.avatars.save(userId, mimeType, content);
    return { profile_picture: profilePictureUrl(userId, { updated_at }) };
  }

  async find(userId: number) {
    const avatar = await this.avatars.find(userId);
    if (!avatar) throw new NotFoundException("Kein Profilbild vorhanden");
    return avatar;
  }

  async urlOf(userId: number): Promise<string | null> {
    const updated_at = await this.avatars.findVersion(userId);
    return updated_at ? profilePictureUrl(userId, { updated_at }) : null;
  }

  remove(userId: number) {
    return this.avatars.remove(userId);
  }
}
