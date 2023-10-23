const express = require('express');
require('dotenv').config();
const app = express();
const dbConfig = require("./config/dbConfig");
const port = process.env.PORT || 8080;

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
        origin: "http://34.155.51.27",
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
let listConnected = [];

function createParty(gameRoomId, username) {
    const party = {
        id: gameRoomId,
        players: [username]
    };
    listOfParties.push(party);
}

gameRoomIO.on("connection", (socket) => {
    /*
    socket.on("join-game-room", (gameRoomId, username) => {
        socket.join(gameRoomId);
        let exists = false;
        let i;
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

     */
    socket.on("join-game-room", (gameRoomId, username) => {
        socket.join(gameRoomId);

        socket.on("connected", (username) => {
            if (!listConnected.includes(username)) {
                listConnected.push(username);
            }
            gameRoomIO.emit("online-users", listConnected);
        });

        socket.on("disconnect", (username) => {
            console.log("disconnected");
            gameRoomIO.to(gameRoomId).emit("player-disconnected", username);
        });

    });

    socket.on("send-new-message", (gameRoomId, message) => {
        console.log(message);
        gameRoomIO.to(gameRoomId).emit("receive-message", message);
    });
})

gameReplayIO.on("connection", (socket) => {

    socket.on("activate-game-replay", async (gameActions, gameEnd, gameName, gameLanguage) => {
        let pythonProcess = {};
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
        console.log("process started");
        pythonProcess.stdin.write(JSON.stringify({init: {players: 2}}) + "\n");
        console.log(gameActions);
        let count = 0;
        for(let i=0; i<gameActions.length; i++) {
            count += 1;
            const actionForServer = JSON.stringify({actions: [{x: gameActions[i].x, y: gameActions[i].y, player: gameActions[i].player}]});
            console.log("action for server = ", actionForServer);
            console.log(`ACTIONS LENGTH = ${gameActions.length} && I = ${i}`);
            setTimeout(() => {
                pythonProcess.stdin.write(JSON.stringify({actions: [{x: gameActions[i].x, y: gameActions[i].y, player: gameActions[i].player}]}) + "\n");
            }, 500);
        }
        await pythonProcess.stdout.on("data", data => {
            try {
                const json_object = JSON.parse(data.toString())
                //console.log(json_object);
                if(json_object?.game_state?.game_over === true || (gameActions.length <= count-3)) {
                    console.log("game over");
                    pythonProcess.kill("SIGINT");
                    socket.emit("send-game-display", json_object.displays[0]);
                }
            }
            catch (error) {
                console.log(error.message);
            }
        });
    })

    socket.on("continue-game", gameAction => {
        const pythonProcess = spawn('python', ['morpion.py.py']);
        console.log("process started");
        pythonProcess.stdin.write(JSON.stringify({init: {players: 2}}) + "\n");
        const actionForServer = JSON.stringify({actions: [{x: gameAction.x, y: gameAction.y, player: gameAction.player}]});
        console.log(`FOR SERVER = ${actionForServer}`);
        setTimeout(() => {
            pythonProcess.stdin.write(actionForServer + "\n");
        }, 500);

        pythonProcess.stdout.on("data", data => {
            try {
                const json_object = JSON.parse(data.toString())
                socket.emit("send-game-display", json_object.displays[0]);
            }
            catch (error) {
                console.log(error.message);
            }
        });
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

            pythonProcess.stdout.setMaxListeners(25);
            data_from_client = {init: {players: 2}};
            await executeGameAction(pythonProcess, socket, chatId);
            nbrOfPlayers = 0;
            socket.on("send-game-action-to-server", async (gameAction) => {
                data_from_client = gameAction;
                try{
                    await executeGameAction(pythonProcess, socket, chatId);
                }
                catch (error) {
                    console.log(error);
                }
            });
        }

        socket.on("update-game", (action) => {
            console.log("action received from other player", action);
            data_from_client = action;
            gameIo.to(chatId).emit("send-game-update-to-other", action);
        })

        socket.on("send-rematch", (userId) => {
            console.log(`user ${userId} asked for a rematch`);
            gameIo.to(chatId).emit("rematch-sent", (userId));
        });

        socket.on("disconnect", () => {
            gameIo.to(chatId).emit("player-disconnected");
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

function executeGameAction(pythonProcess, socket, chatId) {
    return new Promise((resolve, reject) => {
        pythonProcess.stdin.write(JSON.stringify(data_from_client) + "\n");
        console.log("action send to server: ", JSON.stringify(data_from_client))
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