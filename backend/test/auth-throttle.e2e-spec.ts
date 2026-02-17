
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthController Throttling (e2e)', () => {
  let app: INestApplication;

  // Wir mocken den AuthService, damit wir keine echte Datenbank brauchen.
  // Uns interessiert nur, ob der "Türsteher" (Throttler) funktioniert.
  const authServiceMock = {
    create: () => Promise.resolve({ id: 1, email: 'test@test.com' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService) // Wir ersetzen den echten Service
      .useValue(authServiceMock)     // durch unseren Mock
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should allow 3 requests and block the 4th one', async () => {
    // Definieren wir einen Dummy-Body für den Request
    const dto = { email: 'test@example.com', password: 'secretpassword' };

    // 1. Request: Sollte durchgehen (201 Created)
    await request(app.getHttpServer())
      .post('/auth')
      .send(dto)
      .expect(201);

    // 2. Request: Sollte durchgehen
    await request(app.getHttpServer())
      .post('/auth')
      .send(dto)
      .expect(201);

    // 3. Request: Sollte durchgehen (Limit ist 3)
    await request(app.getHttpServer())
      .post('/auth')
      .send(dto)
      .expect(201);

    // 4. Request: JETZT sollte der Throttler zuschlagen!
    // Erwartet: 429 Too Many Requests
    const response = await request(app.getHttpServer())
      .post('/auth')
      .send(dto)
      .expect(429);

    // Optional: Prüfen, ob die Fehlermeldung stimmt
    expect(response.body.message).toMatch(/ThrottlerException/);
  });

  afterAll(async () => {
    await app.close();
  });
});