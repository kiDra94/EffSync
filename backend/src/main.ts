import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as dotenv from "dotenv";
import { configureApp } from "./app.setup";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend läuft auf: http://localhost:${port}`);
  console.log(`📚 Swagger Dokumentation: http://localhost:${port}/api`);
}
bootstrap();
