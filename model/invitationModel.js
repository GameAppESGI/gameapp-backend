const mongoose = require("mongoose");

const invitSchema = new mongoose.Schema(
    {
        from:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        to: 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        accepted:
        {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("invitations", invitSchema);