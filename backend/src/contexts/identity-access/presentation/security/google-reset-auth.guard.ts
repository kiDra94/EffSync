import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleResetAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions() {
    return { state: "reset-password" };
  }
}
