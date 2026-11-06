import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    generateJwtFromGoogleUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("sollte register an AuthService weiterleiten", async () => {
    const dto = {
      username: "newuser",
      email: "new@example.com",
      password: "password123",
      firstname: "New",
      lastname: "User",
    };
    const expected = { user_id: 1, ...dto };
    mockAuthService.register.mockResolvedValue(expected);

    const result = await controller.register(dto as any);

    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it("sollte login an AuthService weiterleiten", async () => {
    const dto = { username: "testuser", password: "password123" };
    const expected = { token: "jwt.token", user_id: 1 };
    mockAuthService.login.mockResolvedValue(expected);

    const result = await controller.login(dto as any);

    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it("sollte im Google Callback ein JWT erzeugen und auf Frontend redirecten", () => {
    process.env.FRONTEND_URL = "http://localhost:5173";
    const req = {
      user: {
        userId: 20,
        username: "oauth.user@gmail.com",
        role: "student",
      },
    };
    const redirect = jest.fn();
    const res = { redirect };

    mockAuthService.generateJwtFromGoogleUser.mockReturnValue(
      "google.jwt.token",
    );

    controller.googleAuthCallback(req as any, res as any);

    expect(mockAuthService.generateJwtFromGoogleUser).toHaveBeenCalledWith(
      req.user,
    );
    expect(redirect).toHaveBeenCalledTimes(1);
    const redirectUrl = redirect.mock.calls[0][0] as string;
    expect(redirectUrl).toContain(
      "http://localhost:5173/auth-callback?token=google.jwt.token",
    );
    expect(redirectUrl).toContain("user=");
  });
});
