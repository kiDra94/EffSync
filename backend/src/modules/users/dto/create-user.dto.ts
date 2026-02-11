import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8, { message: 'Das Passwort muss mindestens 8 Zeichen lang sein.' })
    @MaxLength(32,  { message: 'Das Passwort soll maximal 32 Zeichen lang sein.' })
    password: string;

    @IsString()
    firstname: string;

    @IsString()
    lastname: string;

    @IsString()
    username: string;
}
