import { NextFunction, Response } from "express";
import { FirebaseError } from "firebase-admin";
import { auths } from "models/firebase/firebaseService";
import { RequestAuthHandler } from "types/base";

export async function authFirebaseHandler(
  req: RequestAuthHandler,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).send("Invalid credentials");
  } else {
    const token = authHeader.replace("Bearer ", "");

    let pass = false;
    const length = auths.length;

    for (let index = 0; index < length; index++) {
      const auth = auths[index];
      try {
        const decodedToken = await auth.verifyIdToken(token);

        pass = true;
        req.uid = decodedToken.uid;
        break;
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }

    if (pass) next();
    else res.status(401).send("Invalid credentials");
  }
}
