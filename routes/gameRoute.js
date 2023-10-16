const router = require("express").Router();
const Game = require("../model/gameModel");
const PlayGame = require("../model/playGameModel");
const expressFileUpload = require("express-fileupload");
const path = require('path');
const gameFolder = path.join("./", "");
router.use(expressFileUpload());
const {spawn} = require("child_process");


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

router.get("/get-all-games/:userId", async (req,res) => {
    try {
        const game = await Game.find({
            players: req.params.userId
        });

        if(game.length > 0) {
            res.send({
                success: true,
                message: "History found",
                data: game
            });
        }
        else {
            res.send({
                success: true,
                message: "No history game found",
                data: ""
            });
        }

    }
    catch (error) {
        res.send({
            success: false,
            message: "Error fetching the history",
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

router.post("/upload-game", async (req,res) => {
    try {
        const { game } = req.files;
        game.mv(path.join(gameFolder, game.name));
        res.send({
            success: true,
            message: "Game uploaded successfully",
            data: "savedGame",
        });
    }
    catch(error) {
        res.send({
            success: false,
            message: "Error uploading the game",
            error: error.message,
        });
    }
})

router.post("/upload-game-db", async(req,res) => {
    try {
        const newGame = new PlayGame(req.body);
        const savedGame = await newGame.save();
        res.send({
            success: true,
            message: "Game uploaded successfully",
            data: savedGame,
        });
    }
    catch(error) {
        res.send({
            success: false,
            message: "Error uploading the game to database",
            error: error.message,
        });
    }
})

router.post("/get-all-games", async(req, res) => {
    try {
        const listOfGames = await PlayGame.find({});
        res.send({
            success: true,
            message: "Games fetched successfully",
            data: listOfGames,
        });
    }
    catch(error) {
        res.send({
            success: false,
            message: "Error fetching the games",
            error: error.message,
        });
    }
})


module.exports = router;