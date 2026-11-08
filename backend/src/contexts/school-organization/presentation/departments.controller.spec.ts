import { Test, TestingModule } from "@nestjs/testing";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "../application/departments.service";
import {
  JwtAuthGuard,
  PermissionsGuard,
} from "../../../shared/presentation/security";

describe("DepartmentsController", () => {
  let controller: DepartmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [{ provide: DepartmentsService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
