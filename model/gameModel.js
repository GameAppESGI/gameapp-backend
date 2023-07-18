const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chats",
            required: true,
        },
        gameName: {
            type: String,
            required: true,
        },
        end: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("games", gameSchema);