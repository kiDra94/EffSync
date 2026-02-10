import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as dotenv from 'dotenv';


dotenv.config(); // Lädt die .env Datei manuell ganz am Anfang

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); 
 app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  await app.listen(3000);
  const config = new DocumentBuilder()
    .setTitle("Classrome API")
    .setDescription("Meine coole API")
    .setVersion("1.0")
    .addTag("members")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
