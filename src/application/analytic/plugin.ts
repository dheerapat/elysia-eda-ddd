import { Elysia } from "elysia";
import type { IEventBus } from "@domain/domain-event/eventbus.interface";
import { AnalyticEventHandler } from "./event.handler";

export const createAnalyticPlugin = async (eventBus: IEventBus) => {
  const analyticEventHandler = new AnalyticEventHandler();
  await eventBus.subscribe(
    "user.registered",
    (payload) => analyticEventHandler.handleUserRegistered(payload),
    "analytic",
  );
  return new Elysia();
};
