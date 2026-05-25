import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { factoryRouter } from "./routers/factory";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  factory: factoryRouter,
});

export type AppRouter = typeof appRouter;
