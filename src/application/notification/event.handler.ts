import type { DomainEventMap } from "@domain/domain-event/events";

export class NotificationEventHandler {
  async handleUserRegistered(
    payload: DomainEventMap["user.registered"],
  ): Promise<void> {
    console.log(
      `[NotificationService] Sending welcome email to ${payload.email} (userId: ${payload.userId})`,
    );
  }
}
