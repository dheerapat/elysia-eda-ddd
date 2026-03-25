/**
 * DomainEventMap is the single source of truth for all domain events.
 * Every event name and its payload type are defined here.
 * Both publishers (UserService) and subscribers (NotificationService)
 * import from this file — TypeScript enforces the contract at compile time.
 */
export type DomainEventMap = {
  "user.registered": {
    userId: string;
    email: string;
    name: string;
  };
};
