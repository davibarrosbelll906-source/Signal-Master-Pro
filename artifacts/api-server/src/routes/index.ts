import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import tradesRouter from "./trades.js";
import emailRouter from "./email.js";
import leaderboardRouter from "./leaderboard.js";
import stripeRouter from "./stripe.js";
import lunaRouter from "./luna.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/trades", tradesRouter);
router.use("/email", emailRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/stripe", stripeRouter);
router.use("/luna", lunaRouter);

export default router;
