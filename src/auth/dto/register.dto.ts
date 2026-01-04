import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';


export class RegisterDto {

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    phone : string;

    @IsString()
    @MinLength(8)
    password: string;
}