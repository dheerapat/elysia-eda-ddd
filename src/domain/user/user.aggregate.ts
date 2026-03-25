import type { Email } from "./email.vo";
import type { Name } from "./name.vo";
import { UserId } from "./user-id.vo";

export class User {
  readonly id: UserId;
  readonly email: Email;
  readonly name: Name;

  private constructor(id: UserId, email: Email, name: Name) {
    this.id = id;
    this.email = email;
    this.name = name;
  }

  static create(email: Email, name: Name): User {
    const id = UserId.create(crypto.randomUUID());
    return new User(id, email, name);
  }
}
