import { NextFunction, Response } from "express";
import { FirebaseError } from "firebase-admin";
import { CustomError } from "models/errror";
import { auths } from "models/firebase/firebaseService";
import { RequestAuthHandler } from "types/base";

export async function authFirebaseHandler(
  req: RequestAuthHandler,
  res: Response,
  next: NextFunction
) {
  const session = req.cookies["crawl-auth"] ?? "";

  if (session == "") {
    res.status(404).json({ message: "Không xác thực" });
  } else {
    let pass = false;
    const length = auths.length;

    for (let index = 0; index < length; index++) {
      const auth = auths[index];
      try {
        const decodedToken = await auth.verifySessionCookie(session, true);

        pass = true;
        req.uid = decodedToken.uid;
        break;
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }

    if (pass) next();
    else res.status(404).json({ message: "Không xác thực" });
  }
}
