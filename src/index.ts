import { config } from "dotenv";
config();

export const envs = process.env;

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import { createServer } from "http";
import errorHandler from "middlewares/errorHandler";
import ApiRoute from "routes/api";

process.setMaxListeners(0);

const app: Application = express();
const port: number = Number(envs.PORT) || 8080;

app.use(
  cors({
    origin: (envs.ORIGIN_CORS ?? "http://localhost:3000")
      .split(",")
      .map((item) => item.trim()),
    credentials: true,
  })
);

// For parsing application/json
app.use(express.json({ limit: "50mb" }));

// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// For parsing multipart/form-data
app.use(express.static("public"));

// For parsing cookies
app.use(cookieParser());

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
