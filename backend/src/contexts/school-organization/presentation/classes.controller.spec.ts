import { Test, TestingModule } from "@nestjs/testing";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "../application/classes.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";

describe("ClassesController", () => {
  let controller: ClassesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [{ provide: ClassesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
