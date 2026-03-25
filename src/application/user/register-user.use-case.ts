import { Email } from "@domain/user/email.vo";
import { Name } from "@domain/user/name.vo";
import { User } from "@domain/user/user.aggregate";
import type { IUnitOfWork } from "@infrastructure/unit-of-work/unit-of-work.interface";
import type { IUseCase } from "@application/use-case.interface";

export interface RegisterUserInput {
  email: string;
  name: string;
}

export class RegisterUserUseCase
  implements IUseCase<RegisterUserInput, { userId: string }>
{
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ email: emailStr, name: nameStr }: RegisterUserInput): Promise<{ userId: string }> {
    return this.uow.execute(async (repos, eventBus) => {
      const email = Email.create(emailStr);
      const name = Name.create(nameStr);
      const user = User.create(email, name);

      // 1. INSERT user row (within tx provided by UoW)
      await repos.userRepository.save(user);
      console.log("[UserService] user INSERT done");

      // 2. Publish domain event — routed through same tx by KyselyUnitOfWork
      await eventBus.publish("user.registered", {
        userId: user.id as string,
        email: user.email as string,
        name: user.name,
      });
      console.log("[UserService] user.registered job queued (same tx)");

      return { userId: user.id as string };
    });
  }
}
