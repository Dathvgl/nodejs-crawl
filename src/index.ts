import { config } from "dotenv";
config();

export const envs = process.env;

import cors from "cors";
import express, { Application } from "express";
import { createServer } from "http";
import errorHandler from "middlewares/errorHandler";
import ApiRoute from "routes/api";

process.setMaxListeners(0);

const app: Application = express();
const port: number = Number(process.env.PORT) || 8080;

const originCors = (envs.ORIGIN_CORS ?? "http://localhost:3000")
  .split(",")
  .map((item) => item.trim());

app.use(cors({ origin: originCors, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api", ApiRoute);

app.get("/", async (req, res) => {
  res.send("Hello from ts");
});

app.get("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const server = createServer(app);

server.listen(port, () => {
  console.log(`Server: http://localhost:${port}/`);
});

app.use(errorHandler);
