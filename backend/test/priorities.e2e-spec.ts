import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { createTestApp } from "./setup/create-test-app";

// T58 (M18, decision Q15): exactly the four priorities the UI shows
describe("Priorities after the seed (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  it("seeds Niedrig, Mittel, Hoch and Dringend with the IDs 1 to 4", async () => {
    const priorities = await app.get(PrismaService).priorities.findMany({
      orderBy: { priority_id: "asc" },
    });

    expect(priorities.map((p) => [p.priority_id, p.name])).toEqual([
      [1, "Niedrig"],
      [2, "Mittel"],
      [3, "Hoch"],
      [4, "Dringend"],
    ]);
  });
});
