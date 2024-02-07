import { Request, Response } from "express";
import { stores } from "models/firebase/firebaseService";
import { messageRoomCollection } from "models/mongo";
import { momentNowTS } from "utils/date";

export default class MessageController {
  async postMessageRoom(req: Request, res: Response) {
    const { roomId, uids } = req.body as {
      roomId?: string;
      uids: string[];
    };

    let exist = roomId ?? "";

    if (exist == "") {
      const data = await messageRoomCollection.findOne<{ roomId: string }>(
        { type: "single", uids: { $all: uids } },
        { projection: { roomId: 1 } }
      );

      if (data) exist = data.roomId;
    } else {
      const data = await messageRoomCollection.findOne({ roomId: exist });

      if (!data) {
        for (const store of stores) {
          try {
            await store.collection("messageRoom").doc(exist).set({
              uids,
              type: "single",
              createdAt: momentNowTS(),
            });

            break;
          } catch (error) {
            console.error(error);
          }
        }

        await messageRoomCollection.insertOne({
          roomId: exist,
          type: "single",
          uids,
          createdAt: momentNowTS(),
          updatedAt: momentNowTS(),
        });
      }
    }

    if (exist == "") {
      for (const store of stores) {
        try {
          exist = store.collection("messageRoom").doc().id;
          break;
        } catch (error) {
          console.error(error);
        }
      }
    }

    res.json({ messageRoomId: exist });
  }
}
