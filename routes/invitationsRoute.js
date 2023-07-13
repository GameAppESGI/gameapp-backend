const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Invitation = require("../model/invitationModel");

router.post("/create-new-game-invitation", async (req, res) => {
    try {
        const newInvitation = new Invitation(req.body);
        const savedInvitation = await newInvitation.save();
        res.send({
            success: true,
            message: "Invitation send",
            data: savedInvitation,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Error creating invitation",
            error: error.message,
        });
    }
});

module.exports = router;