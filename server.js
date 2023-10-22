const express = require('express');
require('dotenv').config();
const app = express();
const dbConfig = require("./config/dbConfig");
const port = process.env.PORT || 5000;

const usersRoute = require("./routes/usersRoute");
const chatsRoute = require("./routes/chatRoute");
const messagesRoute = require("./routes/messagesRoute");
const invitationsRoute = require("./routes/invitationsRoute");
const gameRoute = require("./routes/gameRoute");
const gameRoomRoute = require("./routes/gameRoomRoute");

const {spawn} = require("child_process");

app.use(express.json());

app.use("/api/users", usersRoute);
app.use("/api/chats", chatsRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/game-invitations", invitationsRoute);
app.use("/api/games", gameRoute);
app.use("/api/game-rooms", gameRoomRoute);

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    },
});
let onlineUsers = [];
let data_from_client = {};

const gameIo = io.of("/game");
const gameReplayIO = io.of("/replay");
const gameRoomIO = io.of("/gameroom");

let nbrOfPlayers = 0;
let connectedPlayers = [];
let listOfParties = [];

function createParty(gameRoomId, username) {
    const party = {
        id: gameRoomId,
        players: [username]
    };
    listOfParties.push(party);
}

gameRoomIO.on("connection", (socket) => {
    console.log(`${socket.id} connected`);
    socket.on("join-game-room", (gameRoomId, username) => {
        socket.join(gameRoomId);
        let exists = false;
        let i = 0;
        for(i=0; i<listOfParties.length; i++) {
            if(listOfParties[i].id === gameRoomId) {
                exists = true;
                break;

            }
        }
        if(exists && !listOfParties[i].players.includes(username)) {
            listOfParties[i].players.push(username);
        }
        else {
            createParty(gameRoomId, username);
            console.log(`party created with id ${gameRoomId}`);
        }

        console.log(`list of parties = ${listOfParties[i].players}`);
        gameRoomIO.to(gameRoomId).emit("connected", listOfParties[i].players);
    });

    socket.on("send-new-message", (gameRoomId, message) => {
        console.log(`new message received: ${message}`);
        gameRoomIO.to(gameRoomId).emit("receive-message", message);
    })



    socket.on('disconnecting', (gameRoomId, username) => {
        let exists = false;
        let i = 0;
        for(i=0; i<listOfParties.length; i++) {
            if(listOfParties[i].id === gameRoomId) {
                exists = true;
                break;

            }
        }
        if(exists) {
            listOfParties[i].players.pop(username);
            console.log(`${username} disconnected from room with id ${gameRoomId}, ${listOfParties[i].players}`);
        }
        gameRoomIO.to(gameRoomId).emit("disconnected", listOfParties[i]);
    });
})

gameReplayIO.on("connection", (socket) => {
    let pythonProcess = {};
    socket.on("activate-game-replay", async (gameName, gameLanguage) => {
        switch (gameLanguage) {
            case "java": pythonProcess = spawn(gameLanguage, ["-jar", gameName]);
                break;
            case "python" : pythonProcess = spawn(gameLanguage, [gameName]);
                break;
            case "c" : pythonProcess = spawn(gameLanguage, [gameName]);
                break;
            case "rust" : pythonProcess = spawn(gameLanguage, [gameName]);
                break;
        }
        await executeGameActionForReplay(pythonProcess, socket, {init: {players: 2}});
    });

    socket.on("execute-one-action", async (gameAction) => {
        console.log("gameAction received = ", gameAction);
        try{
            await executeGameActionForReplay(pythonProcess, socket, gameAction);
        }
        catch (error) {
            console.log(error);
        }
    });


    socket.on("disconnect", (socket) => {
        console.log("disconnected");
    })
});

gameIo.on("connection", (socket) => {

    socket.on("join-game-room", async (chatId, username, userId, game, language) => {
        connectedPlayers.push(userId);
        nbrOfPlayers++;
        socket.join(chatId);
        console.log(`${username} connected to game-room ${chatId}, nbrOfPlayers = ${nbrOfPlayers}`);
        if (nbrOfPlayers === 2) {
            console.log("pythonprocess can start = ", language );
            let pythonProcess = {};
            switch (language) {
                case "java": pythonProcess = spawn(language, ["-jar", game]);
                break;
                case "python" : pythonProcess = spawn(language, [game]);
                break;
                case "c" : pythonProcess = spawn(language, [game]);
                    break;
                case "rust" : pythonProcess = spawn(language, [game]);
                    break;
            }

            await executeGameAction(pythonProcess, socket, chatId, {init: {players: 2}});
            nbrOfPlayers = 0;
            socket.on("send-game-action-to-server", async (gameAction) => {
                try{
                    await executeGameAction(pythonProcess, socket, chatId, gameAction);
                }
                catch (error) {
                    console.log(error);
                }
            });
        }

        socket.on("update-game", (action) => {
            console.log("action received from other player", action);
            gameIo.to(chatId).emit("send-game-update-to-other", action);
        })

        socket.on("send-rematch", (userId) => {
            console.log(`user ${userId} asked for a rematch`);
            gameIo.to(chatId).emit("rematch-sent", (userId));
        });

        socket.on("disconnect", () => {
            console.log("disconnected");
            gameIo.to(chatId).emit("player-disconnected", socket.id);
        })
    })
});



io.on("connection", (socket) => {
    socket.on("join-room", (userId) => {
        socket.join(userId);
    })

    socket.on("send-new-message", (message) => {
        io.to(message.members[0]).to(message.members[1]).emit("receive-message", message);
    });

    socket.on("read-all-messages", (data) => {
        io.to(data.members[0]).to(data.members[1]).emit("unread-messages-cleared", data);
    });

    socket.on("send-game-invitation", (invitation) => {
        console.log("INVITATION = ", invitation);
        io.to(invitation.sender).to(invitation.receiver).emit("game-invitation-sent", invitation);
    });

    socket.on("accept-invitation", (invitation) => {
        console.log("INVITATION = ",invitation);
        io.to(invitation.sender).emit("game-invitation-accepted", invitation);
    });

    socket.on("cancel-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("invitation-canceled", invitation.toastId);
    });

    socket.on("connected", (userId) => {
        if (!onlineUsers.includes(userId)) {
            onlineUsers.push(userId);
        }
        io.emit("online-users", onlineUsers);
    });


    socket.on("go-offline", (userId) => {
        onlineUsers = onlineUsers.filter((user) => user !== userId);
        io.emit("online-users", onlineUsers);
    });
});

function executeGameActionForReplay(pythonProcess, socket, action) {
    return new Promise((resolve, reject) => {
        pythonProcess.stdin.write(JSON.stringify(action) + "\n");
        pythonProcess.stdin.end();
        console.log("action send to server: ", JSON.stringify(action))
        pythonProcess.stdout.on("data", data => {
            let message = data.toString();
            message = message.replace(/ {4}|[\t\n\r]/gm,'');
            message = message.replace(/ {4}|[^\x00-\xFF]/g, "");
            let filteredMessage = "";
            for(let i=0; i<message.length;i++) {
                if(message[i].charCodeAt(0) >= 48 && message[i].charCodeAt(0) < 127 || message[i].charCodeAt(0) === 34 || message[i].charCodeAt(0) === 44 ) {
                    filteredMessage = filteredMessage + message[i];
                }
            }
            console.log(filteredMessage);
            try {
                const json_object = JSON.parse(filteredMessage);
                if(json_object.displays) {
                    socket.emit("send-game-data-to-client", json_object);
                    resolve(true);
                    if(json_object.game_state?.game_over === true) {
                        console.log("process kill");
                        pythonProcess.kill();
                    }
                }
                else {
                    resolve(false);
                }
            }
            catch (error) {
                console.log(error);
            }
        });
    });
}

function executeGameAction(pythonProcess, socket, chatId, action) {
    return new Promise((resolve, reject) => {
        pythonProcess.stdin.write(JSON.stringify(action) + "\n");
        console.log("action send to server: ", JSON.stringify(action))
        pythonProcess.stdout.on("data", data => {
            let message = data.toString();
            message = message.replace(/ {4}|[\t\n\r]/gm,'');
            message = message.replace(/ {4}|[^\x00-\xFF]/g, "");
            let filteredMessage = "";
            for(let i=0; i<message.length;i++) {
                if(message[i].charCodeAt(0) >= 48 && message[i].charCodeAt(0) < 127 || message[i].charCodeAt(0) === 34 || message[i].charCodeAt(0) === 44 ) {
                    filteredMessage = filteredMessage + message[i];
                }
            }
            console.log(filteredMessage);
            try {
                const json_object = JSON.parse(filteredMessage);
                if(json_object.displays) {
                    gameIo.to(chatId).emit("send-game-data-to-clients", json_object);
                    resolve(true);
                    if(json_object.game_state?.game_over === true) {
                        console.log("process kill");
                        pythonProcess.kill();
                    }
                }
                else {
                    resolve(false);
                }
            }
            catch (error) {
                console.log(error);
            }
        });
    });
}
server.listen(port, () => console.log(`Server ok running on port ${port}`));