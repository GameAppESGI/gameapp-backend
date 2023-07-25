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
        if(game.length === 2) {
            await Game.deleteOne({_id: game[1]._id});
        }
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
});

router.post("/end/:chatId", async (req, res) => {
    try {
        const gameToEnd = await Game.findOne({chat: req.params.chatId, end: false});
        if(gameToEnd) {
            gameToEnd.end = true;
            const updatedGame = await gameToEnd.save();
            res.send({
                success: true,
                message: "Game ended successfully",
                data: updatedGame,
            });
        }


    }
    catch (error) {
        res.send({
            success: false,
            message: "Error ending the game",
            error: error.message,
        });
    }
})

router.post("/add-action/:chatId", async (req, res) => {
    try {
        const gameToUpdate = await Game.findOne({chat: req.params.chatId, end:false});
        if(gameToUpdate) {
            const action = {
                x: req.body.actions[0].x,
                y: req.body.actions[0].y,
                player: req.body.actions[0].player
            }
            gameToUpdate.actions.push(action);
            await gameToUpdate.save();
            res.send({
                success: true,
                message: "Game updated successfully",
                data: gameToUpdate,
            });
        }
    }
    catch (error) {
        res.send({
            success: false,
            message: "Error updating the game",
            error: error.message,
        });
    }
})


module.exports = router;