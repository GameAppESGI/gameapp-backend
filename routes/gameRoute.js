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


module.exports = router;