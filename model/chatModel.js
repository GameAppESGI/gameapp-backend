const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        gameRoomChat:
            {
                type: Boolean,
                default: false,
            },
        members: 
        {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "users",
                },
            ],
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "messages",
        },
        unreadMessages: {
            type: Number,
            default: 0
        },
    }, 
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("chats", chatSchema);