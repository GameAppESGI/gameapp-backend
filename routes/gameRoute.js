const router = require("express").Router();
const Game = require("../model/gameModel");
router.post("/start-new-game", async (req, res) => {
    try {
        const newGame = new Game(req.body);
        const savedGame = await newGame.save();
        res.send({
            success: true,
            message: "Game started",
            data: savedGame,
        });
    }
    catch (error) {
        res.send({
            success: false,
            message: "Error starting the game",
            error: error.message,
        });
    }
});

router.get("/get-active-games/:chatId", async (req,res) => {
    try {
        const game = await Game.find({chat: req.params.chatId, end: false });
        if(game.length > 0) {
            res.send({
                success: true,
                message: "Active game found",
                data: game
            });
        }
        else {
            res.send({
                success: true,
                message: "No active game found",
                data: ""
            });
        }

    }
    catch (error) {
        res.send({
            success: false,
            message: "Error fetching the games",
            error: error.message,
        });
    }
})


module.exports = router;