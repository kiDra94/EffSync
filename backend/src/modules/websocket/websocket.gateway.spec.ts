import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { ChatMessagesService } from '../chat-messages/chat-messages.service';
import { ChatRoomsService } from '../chat-rooms/chat-rooms.service';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: JwtService, useValue: {} },
        { provide: ChatRoomsService, useValue: {} },
        { provide: ChatMessagesService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
