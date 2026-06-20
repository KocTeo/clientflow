import { mockDeep } from "jest-mock-extended";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";
import { JwtService } from "@nestjs/jwt";

const mockUser = {
  id: "1",
  email: "email@email.com",
  name: "user",
  passwordHash: "senha",
  refreshTokenHash: "bla",
  role: "ADMIN",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSut() {
  const prisma = mockDeep<PrismaService>();
  const jwt = mockDeep<JwtService>();
  const authService = new AuthService(prisma, jwt);

  return {
    prisma,
    jwt,
    authService,
  };
}

describe("AuthService", () => {
  describe("register", () => {
    it("Email já cadastrado", () => {
      /*
        O que esse teste precisa fazer:
        1. Chamar makeSut()
        2. Configurar o mock do prisma.user.findUnique para retornar o mockUser (simula email já cadastrado)
        3. Chamar authService.register(...) com dados válidos
        4. Esperar que a promise rejeite com ConflictException do @nestjs/common
        */
    });
  });
});
