import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
} from "../../../shared/presentation/security";
import type { AuthenticatedRequest } from "../../../shared/presentation/security";
import { EmailPreferencesService } from "../application/email-preferences.service";
import { EmailPreferencesDto } from "./dto/email-preferences.dto";

/** The current user's e-mail preferences (T46), in the same envelope as before M23. */
@Controller("email-preferences")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailPreferencesController {
  constructor(private readonly preferences: EmailPreferencesService) {}

  @Get()
  @Permissions("view_dashboard")
  async getPreferences(@Req() req: AuthenticatedRequest) {
    return {
      statusCode: HttpStatus.OK,
      message: "Email preferences retrieved",
      data: await this.preferences.get(req.user.userId),
    };
  }

  @Put()
  @Permissions("view_dashboard")
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: EmailPreferencesDto,
  ) {
    return {
      statusCode: HttpStatus.OK,
      message: "Email preferences updated successfully",
      data: await this.preferences.update(req.user.userId, dto),
    };
  }
}
