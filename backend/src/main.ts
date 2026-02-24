import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as dotenv from "dotenv";
import * as fs from "fs";
import helmet from "helmet";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Ordner ${uploadDir} wurde automatisch erstellt.`);
  }
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: "/api/uploads/",
  });

  const config = new DocumentBuilder()
    .setTitle("EffSync API")
    .setDescription("School Management & Task System - AP 4.6")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication & Authorization")
    .addTag("users", "User Management")
    .addTag("tasks", "Task Management")
    .addTag("task-comments", "Task Comments")
    .addTag("task-activity", "Task Activity Logs")
    .addTag("task-templates", "Task Templates")
    .addTag("documents", "Document Management")
    .addTag("chat-rooms", "Chat Rooms")
    .addTag("chat-messages", "Chat Messages")
    .addTag("notifications", "User Notifications")
    .addTag("notes", "Personal Notes")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend läuft auf: http://localhost:${port}`);
  console.log(`📚 Swagger Dokumentation: http://localhost:${port}/api`);
}
bootstrap();