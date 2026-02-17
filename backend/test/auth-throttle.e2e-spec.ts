import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthController Throttling (e2e)', () => {
  let app: INestApplication;

  const authServiceMock = {
    create: () => Promise.resolve({ id: 1, email: 'test@test.com' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should allow 3 requests and block the 4th one', async () => {
    const dto = { email: 'test@example.com', password: 'secretpassword' };

    await request(app.getHttpServer()).post('/auth').send(dto).expect(201);
    await request(app.getHttpServer()).post('/auth').send(dto).expect(201);
    await request(app.getHttpServer()).post('/auth').send(dto).expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth')
      .send(dto)
      .expect(429);

    expect(response.body.message).toMatch(/ThrottlerException/);
  });

  afterAll(async () => {
    // 1. Zuerst die Nest-App schließen
    await app.close();
    
    // 2. Ein winziger Timeout hilft oft, damit Prisma/Timer Zeit zum Beenden haben
    await new Promise((resolve) => setTimeout(() => resolve(true), 500));
  });
});