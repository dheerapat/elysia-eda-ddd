declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type UserId = Brand<string, "UserId">;

export const UserId = {
  create(value: string): UserId {
    return value as UserId;
  },
};
