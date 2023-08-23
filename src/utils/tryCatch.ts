import { NextFunction, Request, Response } from "express";
import { RequestAuthHandler } from "types/base";

type RequestTryCatch = Request | RequestAuthHandler;

function tryCatch(
  controller: (req: RequestTryCatch, res: Response) => Promise<any> | any
) {
  return async (req: RequestTryCatch, res: Response, next: NextFunction) => {
    try {
      await controller(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export default tryCatch;
