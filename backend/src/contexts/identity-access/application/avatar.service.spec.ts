import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MagicByteFileInspector } from "../../../shared/infrastructure/files/magic-byte-file-inspector";
import { AvatarService } from "./avatar.service";
import { AvatarRepository } from "./ports/avatar.repository";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

// M27 step 6 (T47, decision Q8c): image only, at most 1 MB, by content
describe("AvatarService", () => {
  const updated_at = new Date("2026-11-10T08:00:00Z");
  const find = jest.fn();
  const findVersion = jest.fn();
  const save = jest.fn();
  const remove = jest.fn();
  let service: AvatarService;

  beforeEach(() => {
    jest.resetAllMocks();
    save.mockResolvedValue(updated_at);
    const avatars: AvatarRepository = { find, findVersion, save, remove };
    service = new AvatarService(avatars, new MagicByteFileInspector());
  });

  it("stores an image with the type its bytes show and returns its URL", async () => {
    await expect(service.save(5, PNG)).resolves.toEqual({
      profile_picture: `/users/5/avatar?v=${updated_at.getTime()}`,
    });
    expect(save).toHaveBeenCalledWith(5, "image/png", PNG);
  });

  it("rejects content that is not an image", async () => {
    await expect(
      service.save(5, Buffer.from("%PDF-1.4 kein Bild")),
    ).rejects.toThrow(BadRequestException);
    await expect(service.save(5, Buffer.from("<svg></svg>"))).rejects.toThrow(
      BadRequestException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects an image over 1 MB", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);
    await expect(service.save(5, big)).rejects.toThrow(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it("hands out a stored avatar and 404s without one", async () => {
    find.mockResolvedValueOnce({ mime_type: "image/png", data: PNG });
    await expect(service.find(5)).resolves.toEqual({
      mime_type: "image/png",
      data: PNG,
    });
    find.mockResolvedValueOnce(null);
    await expect(service.find(6)).rejects.toThrow(NotFoundException);
  });

  it("names the URL for a user, null without an avatar", async () => {
    findVersion.mockResolvedValueOnce(updated_at);
    await expect(service.urlOf(5)).resolves.toBe(
      `/users/5/avatar?v=${updated_at.getTime()}`,
    );
    findVersion.mockResolvedValueOnce(null);
    await expect(service.urlOf(6)).resolves.toBeNull();
  });

  it("deletes the avatar", async () => {
    await service.remove(5);
    expect(remove).toHaveBeenCalledWith(5);
  });
});
