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

io.on("connection", (socket) => {
    socket.on("join-room", (userId) => {
        console.log(`SOCKET = ${socket.id}, USER = ${userId}`);
        socket.join(userId);
    })

    socket.on("send-new-message", (message) => {
        io.to(message.members[0]).to(message.members[1]).emit("receive-message", message);
    });

    socket.on("read-all-messages", (data) => {
        io.to(data.members[0]).to(data.members[1]).emit("unread-messages-cleared", data);
    });

    socket.on("send-game-invitation", (invitation) => {
        console.log("GAME INVITATION = ", invitation._id);
        io.to(invitation.members[0]).to(invitation.members[1]).emit("game-invitation-sent", invitation);
    });

    socket.on("accept-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("game-invitation-accepted", invitation);
    });

    socket.on("cancel-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("invitation-canceled", invitation.toastId);
    });

    socket.on("start-game", (game) => {

        io.to(game.members[0]).to(game.members[1]).emit("game-started", game.chat);

        const pythonProcess = spawn('python', ['morpion.py.py']);
        pythonProcess.stdout.setMaxListeners(25);
        data_from_client = {init: {players: 2}};
        executeGameAction(pythonProcess, socket, game.members);

        socket.on("send-game-action-to-server", (gameAction) => {
            data_from_client = gameAction.action;
            executeGameAction(pythonProcess, socket, gameAction.members);
        });
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

function executeGameAction(pythonProcess, socket, members) {
    pythonProcess.stdin.write(JSON.stringify(data_from_client) + "\n");
    console.log(JSON.stringify(data_from_client));
    pythonProcess.stdout.on("data", data => {
        const message = data.toString();
        const json_object = JSON.parse(message);
        io.to(members[0]).to(members[1]).emit("send-game-data-to-clients", json_object);
    });
}






server.listen(port, () => console.log(`Server ok running on port ${port}`));