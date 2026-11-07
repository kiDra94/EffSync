import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";

import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import type { Request } from "express";

interface EmailPreferencesDto {
  email_on_deadline?: boolean;
  email_on_mention?: boolean;
  email_on_comment?: boolean;
  email_digest?: boolean;
  digest_frequency?: "daily" | "weekly" | "monthly";
}

@Controller("email-preferences")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailPreferencesController {
  private logger = new Logger("EmailPreferencesController");

  constructor(private prisma: PrismaService) {}

  /**
   * GET /email-preferences
   * Returns the current user's e-mail preferences
   */
  @Get()
  @Permissions("view_dashboard")
  async getPreferences(@Req() req: Request) {
    try {
      const userId = (req.user as any)?.userId ?? (req.user as any)?.id;

      if (!userId) {
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: "User not found",
        };
      }

      let preferences = await this.prisma.email_preferences.findUnique({
        where: { user_id: userId },
      });

      // If no preferences exist: create the defaults
      if (!preferences) {
        preferences = await this.prisma.email_preferences.create({
          data: {
            user_id: userId,
            email_on_deadline: true,
            email_on_mention: true,
            email_on_comment: true,
            email_digest: false,
            digest_frequency: "daily",
          },
        });
      }

      return {
        statusCode: HttpStatus.OK,
        message: "Email preferences retrieved",
        data: preferences,
      };
    } catch (error) {
      this.logger.error("Error fetching email preferences:", error);
      throw error;
    }
  }

  /**
   * PUT /email-preferences
   * Updates the current user's e-mail preferences
   */
  @Put()
  @Permissions("view_dashboard")
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Req() req: Request,
    @Body() updateDto: EmailPreferencesDto,
  ) {
    try {
      const userId = (req.user as any)?.userId ?? (req.user as any)?.id;

      if (!userId) {
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: "User not found",
        };
      }

      // Check whether preferences exist, otherwise create them
      let preferences = await this.prisma.email_preferences.findUnique({
        where: { user_id: userId },
      });

      if (!preferences) {
        preferences = await this.prisma.email_preferences.create({
          data: {
            user_id: userId,
            ...updateDto,
          },
        });
      } else {
        preferences = await this.prisma.email_preferences.update({
          where: { user_id: userId },
          data: updateDto,
        });
      }

      this.logger.log(`Updated email preferences for user ${userId}`);

      return {
        statusCode: HttpStatus.OK,
        message: "Email preferences updated successfully",
        data: preferences,
      };
    } catch (error) {
      this.logger.error("Error updating email preferences:", error);
      throw error;
    }
  }
}
