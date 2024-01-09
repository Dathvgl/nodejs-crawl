import { BaseMongo } from "./mongo";

export type RoleType = {
  name: string;
  type: Omit<RoleTypeMongo, "createdAt" | "updatedAt">;
};

export type RoleTypeType = {
  name: string;
};

export type RolePost = Omit<Role, "_id"> & { type: string };

export type RoleMongo = BaseMongo & RoleType;
export type RoleTypeMongo = BaseMongo & RoleTypeType;
