import { Test, TestingModule } from "@nestjs/testing";
import { SubjectsController } from "./subjects.controller";
import { SubjectsService } from "./subjects.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../shared/presentation/security";

describe("SubjectsController", () => {
  let controller: SubjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [{ provide: SubjectsService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubjectsController>(SubjectsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
