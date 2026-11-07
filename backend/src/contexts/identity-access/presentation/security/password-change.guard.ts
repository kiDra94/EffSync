import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { PasswordResetService } from "../../application/password-reset.service";

/** The user of POST /auth/set-new-password, by reset token or access token. */
export interface PasswordChangeRequest {
  user: { userId: number };
}

/**
 * Guards POST /auth/set-new-password (M13): a reset token from the e-mail link
 * (told apart by its purpose claim) is checked by PasswordResetService; any
 * other bearer token goes through the normal JWT check, so the Google reset
 * path keeps working.
 */
@Injectable()
export class PasswordChangeGuard extends AuthGuard("jwt") {
  constructor(private readonly resets: PasswordResetService) {
    super();
  }

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
      return (await super.canActivate(context)) as boolean;
    }
    request.user = { userId };
    return true;
  }
}
