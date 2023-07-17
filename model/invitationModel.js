const mongoose = require("mongoose");

const invitSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chats",
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        game: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("invitations", invitSchema);