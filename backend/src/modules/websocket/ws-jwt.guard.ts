import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake.auth?.token;

      if (!token) {
        throw new WsException("You do not have a Token!!!");
      }

      const payload = this.jwtService.verify(token);

      client.data.user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      };

      return true;
    } catch {
      throw new WsException("Invalid Token!!!");
    }
  }
}
