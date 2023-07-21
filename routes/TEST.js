
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { spawn } = require('child_process');
const { sequelize } = require('./database');
const Party = require('./model/Party');


const app = express();
// Initialize Express app
const server = http.createServer(app)

// Create a Socket.IO server instance
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:8081",
        methods: ["GET", "POST"]
    },
});

let parties = {}

const pythonProcess = spawn('python', ['morpion.py.py']);
pythonProcess.stdout.setMaxListeners(25);


function generatePartyId() {
    return Math.random().toString(36).substr(2, 9);
}

let data_from_client = {}


function createParty(socket, username) {
    const partyId = generatePartyId();
    const party = {
        id: partyId,
        players: [
            {id: socket.id, username}],
        maxPlayers: 2,
        minPlayers: 2,
        actions: [],
        playersConnected: [username],
        messages: []
    };
    parties[partyId] = party;
    socket.join(partyId);
    io.to(partyId).emit('hasJoinedParty', username)
    io.to(partyId).emit('partyCreated', party)
}



async function joinParty(socket, {partyId, username}) {
    if (!parties[partyId]) {
        socket.emit('partyError', {message: 'Party not found', username});
        return;
    }

    const party = parties[partyId];
    if (party.playersConnected.length >= party.maxPlayers) {
        socket.emit('partyError', {message: 'Party is full', username});
        return;
    }

    let index = party.players.findIndex(player => player.username === username)
    if (index < 0) {
        party.players.push({id: socket.id, username});
    }
    party.playersConnected.push(username);


    socket.join(partyId);
    //socket.emit('joinedParty', partyId);
    if (party.playersConnected.length >= party.minPlayers && !party.init) {
        data_from_client = {init: {players: 2}}
        try {
            const result = await execute(partyId, socket)
            if (result) {
                party.init = data_from_client
                parties[partyId] = {... party}
            }
        }
        catch (e) {
            console.log(e)
        }
    }
    io.to(partyId).emit('partyUpdated', party);
}

// Handle creating a party



function execute(partyId, socket) {
    return new Promise((resolve, reject) => {
        pythonProcess.stdin.write(JSON.stringify(data_from_client) + "\n");
        pythonProcess.stdout.on('data', data => {
            const message = data.toString();
            const json_message = JSON.parse(message);
            if (json_message.errors && data_from_client.init) {
                io.to(partyId).emit('init-error', json_message.errors[0])
                resolve(false)
            }
            else if (json_message.errors && data_from_client.actions) {
                let playerId = data_from_client.actions[0].player - 1;
                let player = parties[partyId].players[playerId]
                io.to(partyId).emit('unexpected-action', json_message.errors[0])
                resolve(false)
            }
            else if (!json_message.errors) {
                io.to(partyId).emit('get-game-data', json_message)
                resolve(true)
            }
            else {
                resolve(false)
            }

        })
    })
}

// Handle WebSocket connections
io.on('connection', (socket) => {
    socket.on('sendUpdate', (data) => {
        pythonProcess.stdin.write(JSON.stringify(data) + "\n");
    })

    socket.on('joinParty', async ({partyId, username}) => {
        await joinParty(socket, {partyId, username});
    });

    // Handle creating a party request from the client
    socket.on('createParty', (username) => {
        createParty(socket, username);
    });

    socket.on('send-action', async ({x, y, player, partyId}) => {
        data_from_client = {actions: [{x, y, player}]}
        try {
            const result = await execute(partyId, socket)
            if (result) {
                parties[partyId].actions.push({x, y, player});
                io.to(partyId).emit('partyUpdated', parties[partyId]);
            }
        }
        catch (e) {
            console.log(e)
        }
    })

    socket.on('chatMessage', ({id, sender, text, partyId}) => {
        parties[partyId].messages.push({id, sender, text})
        io.to(partyId).emit('partyUpdated', parties[partyId])
    })

    socket.on('leaveParty', ({partyId, playerId}) => {
        let _player = parties[partyId].players[playerId];
        let index = parties[partyId].playersConnected.findIndex(username => username === _player.username)
        parties[partyId].playersConnected.splice(index, 1);
        io.to(partyId).emit('partyUpdated', parties[partyId])
        io.to(partyId).emit('hasLeftParty', {username: _player.username, partyId});
    })
})


server.listen(3000, () => {
    console.log('Server started on port 3000');
});

(async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database and tables created successfully');

    } catch (error) {
        console.error('Error creating database and tables:', error);
    }
})();


