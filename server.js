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
const {spawn} = require("child_process");

app.use(express.json());

app.use("/api/users", usersRoute);
app.use("/api/chats", chatsRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/game-invitations", invitationsRoute);
app.use("/api/games", gameRoute);

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
let nbrOfPlayers = 0;
let connectedPlayers = [];
gameIo.on("connection", (socket) => {

    socket.on("join-game-room", async (chatId, username, userId) => {
        connectedPlayers.push(userId);
        nbrOfPlayers++;
        socket.join(chatId);
        console.log(`${username} connected to game-room ${chatId}, nbrOfPlayers = ${nbrOfPlayers}`);
        if (nbrOfPlayers === 2) {
            console.log("pythonprocess can start");
            const pythonProcess = spawn('python', ['morpion.py.py']);
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
            const message = data.toString();
            try {
                const json_object = JSON.parse(message);
                if(json_object.displays) {
                    gameIo.to(chatId).emit("send-game-data-to-clients", json_object);
                    resolve(true);
                    if(json_object.game_state?.game_over === true) {
                        console.log("process kill");
                        pythonProcess.kill();
                        //pythonProcess.stdin.write(JSON.stringify(""));
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