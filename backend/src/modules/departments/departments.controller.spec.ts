import { Test, TestingModule } from "@nestjs/testing";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "./departments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";

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
