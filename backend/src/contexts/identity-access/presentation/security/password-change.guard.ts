import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { PasswordResetService } from "../../application/password-reset.service";

/** The user of POST /auth/set-new-password, by reset token. */
export interface PasswordChangeRequest {
  user: { userId: number };
}

/**
 * Guards POST /auth/set-new-password (M13): only a reset token passes, from
 * the e-mail link or the Google reset path (review M32), checked by
 * PasswordResetService. A session's access token gets 401 (review M27): it
 * changes the password through /auth/change-password, with the current one.
 */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly resets: PasswordResetService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & Partial<PasswordChangeRequest>>();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    const userId =
      scheme === "Bearer" && token
        ? await this.resets.userIdForResetToken(token)
        : null;

    if (userId === null) {
      throw new UnauthorizedException();
    }
    request.user = { userId };
    return true;
  }
}
