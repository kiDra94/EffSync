import { UserRepository } from "./ports/user.repository";
import { PrismaUserRepository } from "../infrastructure/persistence/prisma-user.repository";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUser = {
    user_id: 1,
    username: "testuser",
    email: "test@example.com",
    password_hash: "$2b$10$hashedPasswordExample",
    firstname: "Test",
    lastname: "User",
    role: "STUDENT",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    users: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock.jwt.token"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UserRepository, useClass: PrismaUserRepository },
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  // POST /auth/login = LocalStrategy (validateCredentials) + issueToken
  const login = async (dto: { identifier: string; password: string }) =>
    service.issueToken(
      await service.validateCredentials(dto.identifier, dto.password),
    );

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("sollte User mit gehashtem Passwort erstellen", async () => {
      const createUserDto = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        firstname: "New",
        lastname: "User",
        role: "STUDENT" as never,
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword123");
      mockPrismaService.users.create.mockResolvedValue({
        ...mockUser,
        username: "newuser",
        email: "new@example.com",
      });
      const result = await service.register(createUserDto);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
      expect(mockPrismaService.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: "newuser",
          email: "new@example.com",
          password_hash: "hashedPassword123",
        }) as unknown,
      });
      expect(result).toHaveProperty("username", "newuser");
    });
  });

  describe("login", () => {
    it("sollte Token zurückgeben bei korrekten Credentials", async () => {
      const loginDto = {
        identifier: "testuser",
        password: "password123",
      };

      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await login(loginDto);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        mockUser.password_hash,
      );
      expect(result).toHaveProperty("token", "mock.jwt.token");
      expect(result).toHaveProperty("username", "testuser");
      expect(result).not.toHaveProperty("password_hash");
    });

    it("sollte UnauthorizedException werfen wenn User nicht existiert", async () => {
      const loginDto = {
        identifier: "nonexistent",
        password: "password123",
      };
      mockPrismaService.users.findFirst.mockResolvedValue(null);
      await expect(login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(login(loginDto)).rejects.toThrow("Ungültige Zugangsdaten");
    });

    it("sollte UnauthorizedException werfen bei falschem Passwort", async () => {
      const loginDto = {
        identifier: "testuser",
        password: "wrongpassword",
      };
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(login(loginDto)).rejects.toThrow("Ungültige Zugangsdaten");
    });

    it("sollte UnauthorizedException werfen wenn password_hash null ist", async () => {
      const loginDto = {
        identifier: "testuser",
        password: "password123",
      };
      mockPrismaService.users.findFirst.mockResolvedValue({
        ...mockUser,
        password_hash: null,
      });
      await expect(login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("validateUser", () => {
    it("sollte User zurückgeben wenn User existiert", async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      const result = await service.validateUser(1);
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { user_id: 1 },
      });
    });

    it("sollte null zurückgeben wenn User nicht existiert", async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      const result = await service.validateUser(999);
      expect(result).toBeNull();
    });
  });

  describe("generateJwtFromGoogleUser", () => {
    it("sollte aus Google-Userdaten einen JWT erstellen", () => {
      const googleUser = {
        userId: 20,
        username: "oauth.user@gmail.com",
        role: "student",
      };

      const token = service.generateJwtFromGoogleUser(googleUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 20,
        username: "oauth.user@gmail.com",
        role: "student",
      });
      expect(token).toBe("mock.jwt.token");
    });
  });
});
