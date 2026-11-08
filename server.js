const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // o WS nativo
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Estado global en memoria del servidor puente
let currentState = {
    orders: [],
    expenses: [],
    users: {},
    branchStock: {}
};

app.get('/api/state', (req, res) => {
    res.json(currentState);
});

app.post('/api/state', (req, res) => {
    currentState = req.body;
    // Transmitir a todos los dispositivos conectados al instante
    io.emit('state_update', currentState);
    res.json({ success: true });
});

io.on('connection', (socket) => {
    console.log('Nuevo dispositivo conectado');
    socket.emit('state_update', currentState);

    socket.on('client_update', (newState) => {
        currentState = newState;
        socket.broadcast.emit('state_update', currentState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor puente corriendo en puerto ${PORT}`);
});