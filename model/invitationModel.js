const mongoose = require("mongoose");

const invitSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
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
        accepted: {
            type: Boolean,
            default: false
        },
        game: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("invitations", invitSchema);