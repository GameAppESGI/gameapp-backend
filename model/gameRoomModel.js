const mongoose = require('mongoose');


const gameRoomSchema = new mongoose.Schema(
    {
        name:
            {
                type: String,
                required: true,
            },
        chat:
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "chats",
            },
        game:
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "games",
            }
    }
);

module.exports = mongoose.model("gameRooms", gameRoomSchema);