import { BaseMongo } from "./mongo";

export type RoleType = {
  code: string;
  name: string;
  type: Omit<RoleTypeMongo, "createdAt" | "updatedAt">;
};

export type RoleTypeType = {
  code: string;
  name: string;
};

export type RolePost = Omit<Role, "_id"> & { type: string };

export type RoleBase = Pick<BaseMongo, "_id"> & RoleType;
export type RoleTypeBase = Pick<BaseMongo, "_id"> & RoleTypeType;

export type RoleMongo = BaseMongo & RoleType;
export type RoleTypeMongo = BaseMongo & RoleTypeType;
