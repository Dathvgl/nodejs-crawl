import { AxiosError } from "axios";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "models/errror";

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log(error);

  if (error instanceof AxiosError) {
    res.status(error.response?.status ?? 400).send(error.message);
  } else if (error instanceof CustomError) {
    res.status(error.statusCode).send(error.message);
  } else res.status(400).send(error);
}
