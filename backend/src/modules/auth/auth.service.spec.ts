import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    user_id: 1,
    username: "testuser",
    email: "test@example.com",
    password_hash: "$2b$10$hashedPasswordExample",
    first_name: "Test",
    last_name: "User",
    role: "STUDENT",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    users: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock.jwt.token"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("sollte User mit gehashtem Passwort erstellen", async () => {
      const createUserDto = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        first_name: "New",
        last_name: "User",
        role: "STUDENT" as any,
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword123");
      mockPrismaService.users.create.mockResolvedValue({
        ...mockUser,
        username: "newuser",
        email: "new@example.com",
      });
      const result = await service.register(createUserDto);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: "newuser",
          email: "new@example.com",
          password_hash: "hashedPassword123",
        }),
      });
      expect(result).toHaveProperty("username", "newuser");
    });
  });

  describe("login", () => {
    it("sollte Token zurückgeben bei korrekten Credentials", async () => {
      const loginDto = {
        username: "testuser",
        password: "password123",
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.login(loginDto);
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
        username: "nonexistent",
        password: "password123",
      };
      mockPrismaService.users.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Username existiert nicht",
      );
    });

    it("sollte UnauthorizedException werfen bei falschem Passwort", async () => {
      const loginDto = {
        username: "testuser",
        password: "wrongpassword",
      };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Passwort ist ungültig",
      );
    });

    it("sollte UnauthorizedException werfen wenn password_hash null ist", async () => {
      const loginDto = {
        username: "testuser",
        password: "password123",
      };
      mockPrismaService.users.findUnique.mockResolvedValue({
        ...mockUser,
        password_hash: null,
      });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});