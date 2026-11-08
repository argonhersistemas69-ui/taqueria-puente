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

// Ruta absoluta asegurada para el archivo de persistencia
const DATA_FILE = path.join(process.cwd(), 'database_store.json');

let currentState = {
    orders: [],
    expenses: [],
    users: {},
    branchStock: {}
};

// Cargar datos al iniciar
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        currentState = JSON.parse(rawData);
        console.log("Base de datos cargada desde el disco correctamente.");
    } catch (e) {
        console.error("Error leyendo database_store.json:", e);
    }
} else {
    console.log("No se encontró archivo previo, se iniciará uno nuevo al guardar.");
}

function saveStateToDisk(state) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
        console.log("Estado guardado en disco exitosamente.");
    } catch (e) {
        console.error("Error crítico al guardar en disco:", e);
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
    console.log('Nuevo dispositivo conectado al puente');
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
