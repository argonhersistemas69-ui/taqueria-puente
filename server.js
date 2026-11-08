const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Archivo local para persistencia en el servidor
const DATA_FILE = path.join(__dirname, 'database_store.json');

// Cargar estado inicial desde archivo o usar valores por defecto
let currentState = {
    orders: [],
    expenses: [],
    users: {},
    branchStock: {}
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        currentState = JSON.parse(rawData);
        console.log("Datos cargados correctamente desde el disco.");
    } catch (e) {
        console.error("Error leyendo archivo de base de datos:", e);
    }
}

function saveStateToDisk(state) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error("Error guardando datos en disco:", e);
    }
}

app.get('/api/state', (req, res) => {
    res.json(currentState);
});

app.post('/api/state', (req, res) => {
    currentState = req.body;
    saveStateToDisk(currentState);
    io.emit('state_update', currentState);
    res.json({ success: true });
});

io.on('connection', (socket) => {
    console.log('Nuevo dispositivo conectado');
    socket.emit('state_update', currentState);

    socket.on('client_update', (newState) => {
        currentState = newState;
        saveStateToDisk(currentState);
        socket.broadcast.emit('state_update', currentState);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor puente corriendo en puerto ${PORT}`);
});
