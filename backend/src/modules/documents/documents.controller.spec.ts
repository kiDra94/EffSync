import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

describe("DocumentsController", () => {
  let controller: DocumentsController;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    grade: jest.fn(),
    remove: jest.fn(),
    getDownloadPayload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("uses the authenticated user for uploads", async () => {
    mockDocumentsService.create.mockResolvedValue({ document_id: 1 });

    await controller.uploadFile(
      {
        originalname: "arbeit.pdf",
        mimetype: "application/pdf",
      } as Express.Multer.File,
      {},
      { user: { userId: 17, role: "student" } },
    );

    expect(mockDocumentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: "arbeit.pdf" }),
      17,
      "application/pdf",
      "student",
      undefined,
    );
  });
});
