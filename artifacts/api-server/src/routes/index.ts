import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import otpRouter from "./otp.js";
import tradesRouter from "./trades.js";
import emailRouter from "./email.js";
import leaderboardRouter from "./leaderboard.js";
import stripeRouter from "./stripe.js";
import lunaRouter from "./luna.js";
import marketRouter from "./market.js";
import backtestRouter from "./backtest.js";
import analystRouter from "./analyst.js";
import aiChatRouter from "./aichat.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/auth", otpRouter);
router.use("/trades", tradesRouter);
router.use("/backtest", backtestRouter);
router.use("/email", emailRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/stripe", stripeRouter);
router.use("/luna", lunaRouter);
router.use("/analyst", analystRouter);
router.use("/ai-chat", aiChatRouter);
router.use("/", marketRouter);

export default router;
