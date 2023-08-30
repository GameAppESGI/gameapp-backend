const router = require("express").Router();
const Chat = require("../model/chatModel");
const Message = require("../model/messageModel");
const authMiddleware = require("../middlewares/authMiddleware");

// create new chat
router.post("/create-new-chat", authMiddleware, async (req, res) => {
    try {
        const newChat = new Chat(req.body);
        const savedChat = await newChat.save();
        await savedChat.populate("members");
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
            gameRoomChat: false,
        }).populate("members").populate("lastMessage").sort({updatedAt: -1});
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

router.post("/read-all-messages",authMiddleware, async(req,res) => {
    try {
        const chat = await Chat.findById(req.body.chat);
        if(!chat) {
            return res.send({
                success: false,
                message: "Chat not found",
            });
        }
        const updatedChat = await Chat.findByIdAndUpdate(
            req.body.chat,
            {
                unreadMessages: 0,
            },
            {new : true}
        ).populate("members").populate("lastMessage");
        await Message.updateMany(
            {
                chat: req.body.chat,
                read: false,
            },
            {
                read: true,
            }
        );
        res.send({
            success: true,
            message: "Read all messages successfully",
            data: updatedChat,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Read all messages failed",
            error: error.message,
        });
    }
});

module.exports = router;