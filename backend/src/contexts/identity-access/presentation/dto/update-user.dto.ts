import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";

// no password here: it can't be stored as is, and would fail with 500 (M11 review)
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password"] as const),
) {}
