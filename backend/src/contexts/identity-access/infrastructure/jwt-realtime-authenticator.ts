import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  RealtimeAuthenticator,
  type RealtimeUser,
} from "../../../shared/application/realtime";
import { PermissionsService } from "../application/permissions.service";

/**
 * A socket's handshake token is an access token, and the user needs
 * view_dashboard: the socket is as protected as the chat REST routes (T54,
 * decision F1).
 */
@Injectable()
export class JwtRealtimeAuthenticator extends RealtimeAuthenticator {
  private readonly logger = new Logger(JwtRealtimeAuthenticator.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
  ) {
    super();
  }

  async authenticate(token: unknown): Promise<RealtimeUser | null> {
    if (typeof token !== "string") return null;
    let payload: { sub: number; username: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      return null; // invalid or expired
    }
    const userId = Number(payload.sub);
    if (
      !(await this.permissionsService.hasPermission(userId, "view_dashboard"))
    ) {
      this.logger.warn(`Socket refused for user ${userId} - no view_dashboard`);
      return null;
    }
    return { userId: payload.sub, username: payload.username };
  }
}
