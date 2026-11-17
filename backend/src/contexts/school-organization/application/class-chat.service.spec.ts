import { ClassChatService } from "./class-chat.service";
import type { ClassRepository } from "./ports/class.repository";

// T29, decision D2 (M21): the members of a class chat
describe("ClassChatService", () => {
  it("lists students, teachers and the head teacher once", async () => {
    const classes = {
      findDetails: jest.fn().mockResolvedValue({
        name: "5AHITM",
        students: [{ user_id: 4 }, { user_id: 5 }],
        teachers: [{ user_id: 2 }, { user_id: 3 }],
        head_teacher: { user_id: 2 },
      }),
    };
    const service = new ClassChatService(classes as unknown as ClassRepository);

    await expect(service.forChat(1)).resolves.toEqual({
      name: "5AHITM",
      headTeacherId: 2,
      memberIds: [4, 5, 2, 3],
    });
    classes.findDetails.mockResolvedValue(null);
    await expect(service.forChat(9)).resolves.toBeNull();
  });
});
