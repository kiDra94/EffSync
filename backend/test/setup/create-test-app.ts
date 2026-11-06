import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { TestingModule } from "@nestjs/testing";
import { App } from "supertest/types";
import { configureApp } from "../../src/app.setup";

/**
 * Creates the E2E app with the same configuration as main.ts, so the tests
 * hit the real routes (T130).
 */
export async function createTestApp(
  moduleFixture: TestingModule,
): Promise<INestApplication<App>> {
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app as INestApplication<App>;
}
