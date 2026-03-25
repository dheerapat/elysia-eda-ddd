import { Elysia } from "elysia";
import type { IEventBus } from "@domain/domain-event/eventbus.interface";
import { NotificationEventHandler } from "./event.handler";

export const createNotificationPlugin = async (eventBus: IEventBus) => {
  const notificationEventHandler = new NotificationEventHandler();
  await eventBus.subscribe(
    "user.registered",
    (payload) => notificationEventHandler.handleUserRegistered(payload),
    "notification",
  );
  return new Elysia();
};
