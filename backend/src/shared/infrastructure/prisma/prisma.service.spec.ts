import { Test, TestingModule } from "@nestjs/testing";
import { Pool } from "pg";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Without this the pg pool keeps the process alive after app.close()
  // (the E2E open-handle warning, GOALS.md M3). $connect only sets up the
  // adapter; the pool opens connections lazily, so no database is needed.
  it("ends its pg pool on module destroy", async () => {
    const end = jest.spyOn(Pool.prototype, "end");
    await service.$connect();

    await service.onModuleDestroy();

    expect(end).toHaveBeenCalledTimes(1);
  });
});
