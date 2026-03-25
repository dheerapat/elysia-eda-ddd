import type { DomainEventMap } from "@domain/domain-event/events";

export class AnalyticEventHandler {
  async handleUserRegistered(
    payload: DomainEventMap["user.registered"],
  ): Promise<void> {
    console.log(
      `[AuditService] User registered — userId: ${payload.userId}, email: ${payload.email}, at: ${new Date().toISOString()}`,
    );
  }
}
