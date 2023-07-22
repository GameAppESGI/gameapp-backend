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
app.use("/api/games/", gameRoute);

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
let parties = {};
let playersJoined = [];

function createGameRoom(socket, chatId) {
    socket.join(chatId);
}

function joinGameRoom(socket, chatId) {
    socket.join(chatId);
}
let nbrOfPlayers = 0;
gameIo.on("connection", (socket) => {

    socket.on("test", (chatId, username) => {
        nbrOfPlayers++;
        socket.join(chatId);
        console.log(`${username} connected to game-room ${chatId}, nbrOfPlayers = ${nbrOfPlayers}`);
        if(nbrOfPlayers === 2) {
            console.log("pythonprocess can start");
            const pythonProcess = spawn('python', ['morpion.py.py']);
            pythonProcess.stdout.setMaxListeners(25);
            data_from_client = {init: {players: 2}};
            executeGameAction(pythonProcess, socket, chatId);
            nbrOfPlayers = 0;
            socket.on("send-game-action-to-server", (gameAction) => {
                data_from_client = gameAction;
                executeGameAction(pythonProcess, socket, chatId);
            });
        }

        socket.on("update-game", (action) => {
            console.log("action received from other player");
            data_from_client = action;
            gameIo.to(chatId).emit("send-game-update-to-other", action);
        })
    })




    /*
    socket.on("create-game-room", (chatId, username) => {
        createGameRoom(socket, chatId);
        console.log(`game room created and ${username} that accepted invitation is connected`);
    })
    socket.on("join-to-room", (chatId, username) => {
        joinGameRoom(socket, chatId);
        console.log(`${username} that sent the invitation is also connected`);
        data_from_client = {init: {players: 2}};
    })

     */
});



io.on("connection", (socket) => {
    //console.log(`connected with ${socket.id}`);
    socket.on("join-room", (userId) => {
        socket.join(userId);
        //console.log(`user ${userId} connected in room ${socket.id} `)
    })

    socket.on("send-new-message", (message) => {
        io.to(message.members[0]).to(message.members[1]).emit("receive-message", message);
    });

    socket.on("read-all-messages", (data) => {
        io.to(data.members[0]).to(data.members[1]).emit("unread-messages-cleared", data);
    });

    socket.on("send-game-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("game-invitation-sent", invitation);
    });

    socket.on("accept-invitation", (invitation) => {
        io.to(invitation.otherUser).emit("game-invitation-accepted", invitation);
    });

    socket.on("cancel-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("invitation-canceled", invitation.toastId);
    });

    /*
    socket.on("start-game", (game) => {

        const pythonProcess = spawn('python', ['morpion.py.py']);
        pythonProcess.stdout.setMaxListeners(25);
        executeGameAction(pythonProcess, socket, game.members);
    });

     */

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
    pythonProcess.stdin.write(JSON.stringify(data_from_client) + "\n");
    console.log("action send to server: ", JSON.stringify(data_from_client))
    pythonProcess.stdout.on("data", data => {
        const message = data.toString();
        const json_object = JSON.parse(message);
        gameIo.to(chatId).emit("send-game-data-to-clients", json_object);
    });
}






server.listen(port, () => console.log(`Server ok running on port ${port}`));