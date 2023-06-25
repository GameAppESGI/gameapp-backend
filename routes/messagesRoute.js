const authMiddleware = require('../middlewares/authMiddleware');
const Message = require('../model/messageModel');
const router = require('express').Router();
const Chat = require('../model/chatModel');


router.post('/new-message', async (req, res) => {
    try {
        const newMessage = new Message(req.body)
        const savedMessage = await newMessage.save();
        await Chat.findOneAndUpdate(
            { _id: req.body.chat },
            {
                lastMessage: savedMessage._id,
                $inc: { unreadMessages: 1 },
            }
        );
        res.send({
            success: true,
            message: "Message send successfully",
            data: savedMessage,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Error sending message",
            data: error.message,
        });
    }
});

router.get('/get-all-messages/:chatId', async(req,res) => {
    try {
        const messages = await Message.find({
            chat: req.params.chatId,
        }).sort({createdAt: 1});
        res.send({
            success: true,
            message: "Message fetched successfully",
            data: messages,
        });
    } catch (error) {
        res.send({
            success: false,
            message: "Failed to fetch messages",
            data: error.message,
        });
    }
});

module.exports = router;