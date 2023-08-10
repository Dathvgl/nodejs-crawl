import { NextFunction, Request, Response } from "express";

function tryCatch(
  controller: (req: Request, res: Response) => Promise<any> | any
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export default tryCatch;
