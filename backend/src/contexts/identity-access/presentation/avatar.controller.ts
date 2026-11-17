import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { AvatarService } from "../application/avatar.service";
import { MAX_AVATAR_BYTES } from "../domain/avatar";
import type { AuthenticatedRequest } from "./security/authenticated-request";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { Permissions } from "./security/permissions.decorator";
import { PermissionsGuard } from "./security/permissions.guard";

/**
 * The profile picture (T47, decision Q8c, M27); user responses name its URL
 * as `profile_picture`. Reading needs a token too (review M27: no photos of
 * pupils for anyone who counts up the ids), so the frontend loads it with
 * the token instead of an <img> URL.
 */
@ApiTags("users")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Kein oder ungültiges Token" })
@ApiForbiddenResponse({ description: "Fehlende Berechtigung" })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("users")
export class AvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @ApiOperation({
    summary: "Upload the own profile picture (image, max. 1 MB)",
  })
  @ApiConsumes("multipart/form-data")
  @Put("me/avatar")
  @Permissions("view_dashboard")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  // multer stops reading at the limit and answers 413
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_BYTES },
    }),
  )
  upload(
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.avatars.save(req.user.userId, file.buffer);
  }

  @ApiOperation({ summary: "Delete the own profile picture" })
  @Delete("me/avatar")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions("view_dashboard")
  async remove(@Req() req: AuthenticatedRequest) {
    await this.avatars.remove(req.user.userId);
  }

  @ApiOperation({ summary: "A user's profile picture" })
  @Get(":id/avatar")
  @Permissions("view_dashboard")
  // a list loads one picture per member: images aren't counted like API calls
  @SkipThrottle()
  // the URL carries the change time, so a cached copy is never stale for long
  @Header("Cache-Control", "private, max-age=86400")
  async find(@Param("id", ParseIntPipe) id: number) {
    const avatar = await this.avatars.find(id);
    return new StreamableFile(Buffer.from(avatar.data), {
      type: avatar.mime_type,
      disposition: "inline",
    });
  }
}
