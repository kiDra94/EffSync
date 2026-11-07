import { UserRepository } from "./ports/user.repository";
import { PrismaUserRepository } from "../infrastructure/persistence/prisma-user.repository";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { RolePermissionsService } from "./role-permissions.service";

describe("UsersService", () => {
  let service: UsersService;

  const mockPrismaService = {
    users: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UserRepository, useClass: PrismaUserRepository },
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RolePermissionsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
