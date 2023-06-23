const router = require("express").Router();
const Chat = require("../model/chatModel");
const authMiddleware = require("../middlewares/authMiddleware");

// create new chat
router.post("/create-new-chat", authMiddleware, async (req, res) => {
    try {
        const newChat = new Chat(req.body);
        const savedChat = await newChat.save();
        res.send({
            success: true,
            message: "Chat created",
            data: savedChat,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Error creating chat",
            error: error.message,
        });
    }
});

// get all chat of user
router.get("/get-all-chats", authMiddleware, async (req, res) => {
    try {
        const chats = await Chat.find({
            members:
            {
                $in: [req.body.userId],
            },
        }).populate("members").sort({updateAt: -1});
        res.send({
            success: true,
            message: "Chats fetched successfully",
            data: chats,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Error fetching chat",
            error: error.message,
        });
    }
})

module.exports = router;