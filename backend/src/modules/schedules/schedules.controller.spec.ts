import { Test, TestingModule } from "@nestjs/testing";
import { SchedulesController } from "./schedules.controller";
import { SchedulesService } from "./schedules.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../shared/presentation/security";

describe("SchedulesController", () => {
  let controller: SchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [{ provide: SchedulesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SchedulesController>(SchedulesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
