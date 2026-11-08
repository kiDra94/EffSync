import { Test, TestingModule } from "@nestjs/testing";
import { RoomsController } from "./room.controller";
import { RoomsService } from "../application/room.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";

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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
