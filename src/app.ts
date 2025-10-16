import express, { NextFunction, Request, Response } from "express";

import cors from "cors";
import cookieParser from "cookie-parser";

import passport from "passport";
import expressSession from "express-session";

import "./app/config/passport";
import notFound from "./app/middlewares/notFound";
import { globalErrorHanlder } from "./app/middlewares/globalErrorHandler";
import { router } from "./app/routes";
import { envVars } from "./app/config/env";

const app = express();
console.log("test")
app.use(
  expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    messege: "hello welcome to parcel management backend",
  });
});

app.use(globalErrorHanlder);

app.use(notFound);

export default app;
