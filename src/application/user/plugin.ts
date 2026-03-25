import Elysia, { t } from "elysia";
import type { IUnitOfWork } from "@infrastructure/unit-of-work/unit-of-work.interface";
import { RegisterUserUseCase } from "@application/user/register-user.use-case";
import type { Kysely } from "kysely";
import type { Database } from "@infrastructure/db/types";
import { UserRepository } from "@infrastructure/repository/user.repository";

export const userPlugin = new Elysia({ prefix: "/user" })
  .decorate("kysely", {} as Kysely<Database>)
  .decorate("unitOfWork", {} as IUnitOfWork)
  .resolve(({ unitOfWork }) => ({
    registerUser: new RegisterUserUseCase(unitOfWork),
  }))
  .resolve(({ kysely }) => ({
    userRepo: new UserRepository(kysely),
  }))
  .get("/users", async ({ userRepo }) => {
    return userRepo.findAll();
  })
  .post(
    "/register",
    async ({ registerUser, body }) => {
      const { email, name } = body;
      const result = await registerUser.execute({ email, name });
      return { userId: result.userId };
    },
    {
      body: t.Object({
        email: t.String(),
        name: t.String(),
      }),
    },
  );
