declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type Email = Brand<string, "Email">;

export const Email = {
  create(value: string): Email {
    // Basic format check: must contain '@' with at least one char before and after,
    // and a '.' somewhere after the '@'
    const atIdx = value.indexOf("@");
    if (atIdx < 1) throw new Error("Invalid email format");
    const afterAt = value.slice(atIdx + 1);
    if (!afterAt.includes(".") || afterAt.endsWith(".")) {
      throw new Error("Invalid email format");
    }
    return value as Email;
  },
};
