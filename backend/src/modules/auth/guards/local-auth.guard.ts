import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Checks the login credentials through LocalStrategy (T116). */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}
