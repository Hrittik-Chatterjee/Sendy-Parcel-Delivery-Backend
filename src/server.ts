import { Server } from "http";

import mongoose from "mongoose";

import app from "./app";

import { envVars } from "./app/config/env";
import { seedSuperAdmin } from "./app/utils/seedSuperAdmin";
let server: Server;

const startServer = async () => {
  try {
    await mongoose.connect(envVars.MONGO_URI);
    console.log("connected to tour management db");
    server = app.listen(envVars.PORT, () => {
      console.log(`Server is listeing to port ${envVars.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  await startServer();
  await seedSuperAdmin();
})();

process.on("unhandledRejection", (err) => {
  console.log("unhandled Rejection error, Server shutting down", err);
  if (server) {
    server.close(() => {});
    process.exit(1);
  }
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.log("uncaught Rejection error, Server shutting down", err);
  if (server) {
    server.close(() => {});
    process.exit(1);
  }
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal  error, Server shutting down");
  if (server) {
    server.close(() => {});
    process.exit(1);
  }
  process.exit(1);
});
process.on("SIGINT", () => {
  console.log("SIGINT signal  error, Server shutting down");
  if (server) {
    server.close(() => {});
    process.exit(1);
  }
  process.exit(1);
});
