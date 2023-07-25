const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema(
    {
        x: {
            type: Number,
            required: true

        },
        y: {
            type: Number,
            required: true
        },
        player: {
            type: Number,
            required: true
        }
    }
);

const gameSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
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
        actions: {
            type: [
                {
                    type: actionSchema,
                    required: true
                }
            ]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("games", gameSchema);