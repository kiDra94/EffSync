import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";

@Module({
  imports: [UsersModule, PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.registerAsync({
    useFactory: (): JwtModuleOptions => ({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || "1h") as any,
      },
    }),
  })
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
