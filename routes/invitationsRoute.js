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

router.post('/cancel/:invitationId', async (req, res) => {
    try {
        await Invitation.deleteOne({_id: req.params.invitationId});
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

router.post("/accept/:invitationId", async (req,res) => {
    try {
        const invitationToAccept = await Invitation.findOne({_id: req.params.invitationId});
        invitationToAccept.accepted = true;
        if(invitationToAccept) {
            const updatedInvitation = await invitationToAccept.save();
            res.send({
                success: true,
                message: "Invitation accepted successfully",
                data: updatedInvitation,
            });
        }

    }
    catch (error) {
        res.send({
            success: false,
            message: "Error accepting invitation",
            error: error.message,
        });
    }
})

module.exports = router;