import { BadRequestException } from "@nestjs/common";
import { GHOST_USER_ID } from "../../identity-access/application";
import { normalizeTags } from "../domain/task";

// input checks of TaskService's create and update (moved out of task.service.ts
// for the Definition of done's 500-line limit)

/** The ghost user (M14) is no real person and can't be assigned (M16). */
export function assertNotGhostAssignee(assignedTo: number | null | undefined) {
  if (assignedTo === GHOST_USER_ID) {
    throw new BadRequestException(
      "Der Ghost-User kann nicht zugewiesen werden",
    );
  }
}

/** The stored tag names (T59); the column holds 50 characters after normalizing. */
export function validTags(names: string[]): string[] {
  const normalized = normalizeTags(names);
  if (normalized.some((name) => name.length > 50)) {
    throw new BadRequestException(
      "Ein Tag darf höchstens 50 Zeichen lang sein",
    );
  }
  return normalized;
}
