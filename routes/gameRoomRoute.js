const GameRoom = require("../model/gameRoomModel");
const Chat = require("../model/chatModel");
const router = require("express").Router();
router.post("/new-game-room", async (req, res) => {
    try {
        const newGameRoom = new GameRoom(req.body);
        const savedGameRoom = await newGameRoom.save();
        await savedGameRoom.populate("chat");
        await savedGameRoom.populate("game");
        res.send({
            success: true,
            message: "GameRoom created",
            data: savedGameRoom,
        });
    }
    catch (error) {
        res.send({
            success: false,
            message: "Error creating the game room",
            error: error.message,
        });
    }
});

router.post("/join", async (req, res) => {
    try {
        const gameRoom = await GameRoom.findOne({_id: req.body.gameRoomId});
        if(gameRoom) {
            const chat = await Chat.findOne({_id: gameRoom.chat})
            if(chat) {
                chat.members.push(req.body.userId);
                console.log(req.body.userId);
            }
            await chat.save();
            await gameRoom.populate("game");
            await gameRoom.populate("chat");
            res.send({
                success: true,
                message: "GameRoom joined",
                data: gameRoom,
            });
        }
    }
    catch (error) {
        res.send({
            success: false,
            message: "Error joining the game room, room does not exist",
            error: error.message,
        });
    }
});

module.exports = router;