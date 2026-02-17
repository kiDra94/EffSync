import { Test, TestingModule } from "@nestjs/testing";
import { RoomsController } from "./room.controller"; 
import { RoomsService } from "./room.service";      

describe("RoomsController", () => {
  let controller: RoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: {}, 
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});