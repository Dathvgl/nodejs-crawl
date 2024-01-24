import { NextFunction, Response } from "express";
import { CustomError } from "models/errror";
import { fieldLookup, userCollection } from "models/mongo";
import { RequestAuthHandler } from "types/base";
import { UserType } from "types/user";

export default function roleHandler(roles: string[]) {
  return async (req: RequestAuthHandler, res: Response, next: NextFunction) => {
    const { uid } = req;
    if (uid) throw new CustomError("Không xác thực", 400);

    const user = await userCollection
      .aggregate<Pick<UserType, "_id" | "uid" | "roles">>([
        { $match: { uid } },
        ...fieldLookup({
          document: "role",
          field: "roles",
          as: "roles",
          array: true,
          project: { $project: { type: 0, createdAt: 0, updatedAt: 0 } },
        }),
        { $project: { _id: 1, uid: 1, roles: 1 } },
      ])
      .next();

    if (!user) throw new CustomError("Không người dùng", 400);

    if (roles.length == 0) {
      next();
    } else {
      const rolesRequest = user.roles.map(({ name }) => name);

      const check = rolesRequest.some((item) => {
        return roles.includes(item);
      });

      if (check) next();
      else throw new CustomError("Không đủ quyền", 400);
    }
  };
}
