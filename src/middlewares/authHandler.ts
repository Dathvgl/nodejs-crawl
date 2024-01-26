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
    let revoke = false;

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

        console.error(`Firebase ${index}`);
        console.error(error.code);
        console.error(error.message);

        if (error.code == "auth/session-cookie-revoked") {
          revoke = true;
          res.clearCookie("crawl-auth");
          const decodedClaims = await auth.verifySessionCookie(session);
          await auth.revokeRefreshTokens(decodedClaims.sub);
          break;
        }
      }
    }

    if (pass) next();
    else {
      if (revoke) {
        res.status(200).json({ message: "Xóa xác thực" });
      } else {
        res.status(404).json({ message: "Không xác thực" });
      }
    }
  }
}
