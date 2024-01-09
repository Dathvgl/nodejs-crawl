import { Request, Response } from "express";
import {
  aggregateList,
  fieldLookup,
  roleCollection,
  roleTypeCollection,
} from "models/mongo";
import { ObjectId } from "mongodb";
import { RolePost, RoleType, RoleTypeType } from "types/role";
import { numBase } from "utils/check";
import { momentNowTS } from "utils/date";

export default class RoleController {
  async getRole(req: Request, res: Response) {
    const { page, limit, name } = req.query as {
      page?: string;
      limit?: string;
      name?: "asc" | "desc";
    };

    const aggregate = aggregateList({
      listHandle: {
        page: numBase(page, { default: 1 }),
        limit: numBase(limit, { default: 5 }),
      },
      facetBefore: [
        { $sort: { createdAt: -1, name: name == "desc" ? -1 : 1 } },
        ...fieldLookup({
          document: "roleType",
          field: "type",
          as: "type",
          project: { $project: { createdAt: 0, updatedAt: 0 } },
        }),
      ],
    });

    const data = await roleCollection.aggregate(aggregate).next();

    res.json(data);
  }

  async getRoleType(req: Request, res: Response) {
    const { page, limit, name } = req.query as {
      page?: string;
      limit?: string;
      name?: "asc" | "desc";
    };

    const aggregate = aggregateList({
      listHandle: {
        page: numBase(page, { default: 1 }),
        limit: numBase(limit, { default: 5 }),
      },
      facetBefore: [
        { $sort: { createdAt: -1, name: name == "desc" ? -1 : 1 } },
      ],
    });

    const data = await roleTypeCollection.aggregate(aggregate).next();

    res.json(data);
  }

  async postRole(req: Request, res: Response) {
    const body = req.body as RolePost;
    const { type, ...rest } = body;

    const { insertedId } = await roleCollection.insertOne({
      ...rest,
      type: new ObjectId(type),
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });

    res.json({ _id: insertedId, ...body });
  }

  async postRoleType(req: Request, res: Response) {
    const body = req.body as RoleTypeType;

    const { insertedId } = await roleTypeCollection.insertOne({
      ...body,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });

    res.json({ _id: insertedId, ...body });
  }

  async putRole(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body as RolePost;
    const { type, ...rest } = body;

    await roleTypeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...rest, type: new ObjectId(type), updatedAt: momentNowTS() } }
    );

    res.json({ _id: id, ...body });
  }

  async putRoleType(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body as RoleTypeType;

    await roleTypeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...body, updatedAt: momentNowTS() } }
    );

    res.json({ _id: id, ...body });
  }

  async deleteRole(req: Request, res: Response) {
    const { id } = req.params;

    await roleCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({ _id: id });
  }

  async deleteRoleType(req: Request, res: Response) {
    const { id } = req.params;

    await roleCollection.deleteMany({ type: new ObjectId(id) });
    await roleTypeCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({ _id: id });
  }
}
