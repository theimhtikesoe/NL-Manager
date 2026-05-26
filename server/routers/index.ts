import { systemRouter } from "../_core/systemRouter";
import { router } from "../_core/trpc";
import { authRouter } from "./auth";
import { factoryRouter } from "./factory";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  factory: factoryRouter,
});

export type AppRouter = typeof appRouter;
