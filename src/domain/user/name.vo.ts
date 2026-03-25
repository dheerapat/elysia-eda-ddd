declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type Name = Brand<string, "Name">;

export const Name = {
  create(value: string): Name {
    return value as Name;
  },
};
