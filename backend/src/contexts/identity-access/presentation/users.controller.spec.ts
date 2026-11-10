import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../application/users.service";
import { TwoFactorService } from "../application/two-factor.service";
import { UserSettingsService } from "../application/user-settings.service";
import { AvatarService } from "../application/avatar.service";
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
  const mockSettings = { find: jest.fn(), update: jest.fn() };
  const mockAvatars = { urlOf: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        { provide: TwoFactorService, useValue: mockTwoFactor },
        { provide: UserSettingsService, useValue: mockSettings },
        { provide: AvatarService, useValue: mockAvatars },
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

  // decision Q8c (M27): the profile names the picture's URL
  it("returns the profile with the profile picture", async () => {
    mockAvatars.urlOf.mockResolvedValue("/users/4/avatar?v=1");
    const req = { user: { userId: 4, firstname: "Felix" } } as never;

    await expect(controller.getProfile(req)).resolves.toEqual({
      userId: 4,
      firstname: "Felix",
      profile_picture: "/users/4/avatar?v=1",
    });
    expect(mockAvatars.urlOf).toHaveBeenCalledWith(4);
  });

  // decision Q8f (M25): the settings are the signed-in user's own
  it("reads and changes the signed-in user's settings", async () => {
    const req = { user: { userId: 4 } } as never;
    await controller.getSettings(req);
    await controller.updateSettings(req, { theme: "dark" });

    expect(mockSettings.find).toHaveBeenCalledWith(4);
    expect(mockSettings.update).toHaveBeenCalledWith(4, { theme: "dark" });
  });

  // decision Q8d (M32): the admin reset deletes the user's TOTP secret
  it("resets a user's 2FA", async () => {
    await controller.resetTwoFactor(4);

    expect(mockTwoFactor.reset).toHaveBeenCalledWith(4);
  });
});
