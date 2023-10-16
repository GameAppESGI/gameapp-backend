const mongoose = require("mongoose");
const {Schema} = require("mongoose");


const playGameSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
        }
    }
);

module.exports = mongoose.model("playGames", playGameSchema);