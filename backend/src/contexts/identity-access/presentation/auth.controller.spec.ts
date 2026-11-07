import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "../application/auth.service";
import { SessionService } from "../application/session.service";

describe("AuthController", () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    issueToken: jest.fn(),
    generateJwtFromGoogleUser: jest.fn(),
  };
  const mockSessions = {
    start: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        { provide: SessionService, useValue: mockSessions },
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

    const result = await controller.register(dto as never);

    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  // M9: LocalAuthGuard validates the credentials; the handler issues the token for req.user
  // M12 (T51): the login also starts a session and returns its refresh token
  it("issues the access token and a refresh token for the user LocalAuthGuard validated", async () => {
    const dto = { identifier: "testuser", password: "password123" };
    const user = { user_id: 1, username: "testuser" };
    mockAuthService.issueToken.mockReturnValue({
      token: "jwt.token",
      user_id: 1,
    });
    mockSessions.start.mockResolvedValue("refresh.token");

    const result = await controller.login({ user } as never, dto);

    expect(mockAuthService.issueToken).toHaveBeenCalledWith(user);
    expect(mockSessions.start).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      token: "jwt.token",
      user_id: 1,
      refreshToken: "refresh.token",
    });
  });

  it("passes refresh and logout to the SessionService", async () => {
    mockSessions.refresh.mockResolvedValue({ token: "a", refreshToken: "b" });

    await expect(controller.refresh({ refreshToken: "old" })).resolves.toEqual({
      token: "a",
      refreshToken: "b",
    });
    await controller.logout({ refreshToken: "current" });

    expect(mockSessions.refresh).toHaveBeenCalledWith("old");
    expect(mockSessions.logout).toHaveBeenCalledWith("current");
  });

  it("sollte im Google Callback ein JWT erzeugen und auf Frontend redirecten", async () => {
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
    mockSessions.start.mockResolvedValue("google.refresh");

    await controller.googleAuthCallback(req as never, res as never);

    expect(mockAuthService.generateJwtFromGoogleUser).toHaveBeenCalledWith(
      req.user,
    );
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(mockSessions.start).toHaveBeenCalledWith(20);
    // decision Q9 (M9): tokens in the fragment, no query parameters, no user object;
    // M12: the refresh token travels the same way
    const redirectUrl = (redirect.mock.calls as unknown[][])[0][0] as string;
    expect(redirectUrl).toBe(
      "http://localhost:5173/auth-callback#token=google.jwt.token&refreshToken=google.refresh",
    );
  });

  it("starts no session for the Google reset-password callback", async () => {
    const redirect = jest.fn();
    mockAuthService.generateJwtFromGoogleUser.mockReturnValue("reset.jwt");

    await controller.googleAuthCallback(
      {
        user: { userId: 20, username: "u", role: "student" },
        query: { state: "reset-password" },
      } as never,
      { redirect } as never,
    );

    expect(mockSessions.start).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:5173/reset-password#token=reset.jwt",
    );
  });
});
