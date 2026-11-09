import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../application/users.service";
import { TwoFactorService } from "../application/two-factor.service";
import { UsersController } from "./users.controller";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PermissionsGuard } from "./security/permissions.guard";

describe("UsersController", () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockTwoFactor = { reset: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        { provide: TwoFactorService, useValue: mockTwoFactor },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // decision Q8d (M32): the admin reset deletes the user's TOTP secret
  it("resets a user's 2FA", async () => {
    await controller.resetTwoFactor(4);

    expect(mockTwoFactor.reset).toHaveBeenCalledWith(4);
  });
});
