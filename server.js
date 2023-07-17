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

app.use(express.json());

app.use("/api/users", usersRoute);
app.use("/api/chats", chatsRoute);
app.use("/api/messages",messagesRoute);
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
        io.to(invitation.members[0]).to(invitation.members[1]).emit("game-invitation-sent", invitation);
    });

    socket.on("cancel-invitation", (invitation) => {
        io.to(invitation.members[0]).to(invitation.members[1]).emit("invitation-canceled");
    })

    socket.on("start-game", (data) => {
        io.to(data.members[0]).to(data.members[1]).emit("game-started");
    })

    socket.on("connected", (userId) => {
        if(!onlineUsers.includes(userId)) {
            onlineUsers.push(userId);
        }
        io.emit("online-users", onlineUsers);
    });

    socket.on("go-offline", (userId) => {
        onlineUsers = onlineUsers.filter((user) => user !== userId);
        io.emit("online-users", onlineUsers);
    });
});


server.listen(port, () => console.log(`Server ok running on port ${port}`));