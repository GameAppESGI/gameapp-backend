const router = require("express").Router();
const Invitation = require("../model/invitationModel");

router.post("/new-invitation", async (req, res) => {
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

router.get('/get-all-invitations/:chatId', async(req,res) => {
    try {
        const invitations = await Invitation.find({
            chat: req.params.chatId,
        }).sort({createdAt: 1});
        res.send({
            success: true,
            message: "Invitations fetched successfully",
            data: invitations,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Failed to fetch invitations",
            data: error.message,
        });
    }
});

router.post('/cancel/:chatId', async (req, res) => {
    try {
        await Invitation.deleteOne({chat: req.params.chatId});
        res.send({
            success: true,
            message: "Invitation deleted successfully",
            data: "",
        })
    } catch (error) {
        res.send({
            success: false,
            message: "Error deleting invitation",
            error: error.message,
        });
    }
});

module.exports = router;