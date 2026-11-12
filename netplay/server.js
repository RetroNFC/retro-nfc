// =====================================================
// RETRO NFC - servidor de netplay (Socket.IO)
// Port do servidor oficial do EmulatorJS para Node.js.
// Salas ficam apenas em memoria: nao precisa de banco.
// =====================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
    serveClient: false
    maxHttpBufferSize: 5 * 1024 * 1024
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

const PORT = process.env.PORT || 3000;

const rooms = new Map();
const index = new Map();

function normalizePassword(p) {
    if (typeof p !== 'string') return null;
    const t = p.trim();
    if (!t || t.toLowerCase() === 'none') return null;
    return t;
}

function toStr(v) {
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
}

function field(obj, k) {
    if (!obj || typeof obj !== 'object') return null;
    return toStr(obj[k]);
}

function socketIdsOf(room) {
    return Object.values(room.players)
        .map(p => p && p.socketId)
        .filter(Boolean);
}

function emitMany(ids, event, payload, exceptId) {
    ids.forEach(id => {
        if (exceptId && id === exceptId) return;
        io.to(id).emit(event, payload);
    });
}

function leaveInternal(socket) {
    const idx = index.get(socket.id);
    if (!idx) return;

    index.delete(socket.id);

    const room = rooms.get(idx.sessionId);
    if (!room) return;

    delete room.players[idx.playerId];
    room.peers = room.peers.filter(p => p.source !== socket.id && p.target !== socket.id);

    let renegotiate = null;

    if (room.owner === socket.id && Object.keys(room.players).length) {
        const next = Object.values(room.players)[0];
        if (next && next.socketId) {
            room.owner = next.socketId;
            room.peers.forEach(p => {
                if (p.source === socket.id) p.source = next.socketId;
            });
            if (room.peers.length) {
                renegotiate = { owner: next.socketId, target: room.peers[0].target };
            }
        }
    }

    const ids = socketIdsOf(room);

    if (renegotiate) {
        io.to(renegotiate.owner).emit('webrtc-signal', {
            target: renegotiate.target,
            requestRenegotiate: true
        });
    }

    if (ids.length) emitMany(ids, 'users-updated', room.players, socket.id);

    if (!Object.keys(room.players).length) rooms.delete(idx.sessionId);

    socket.leave(idx.sessionId);
}

app.get('/', (req, res) => {
    res.json({ ok: true, service: 'retronfc-netplay', salas: rooms.size });
});

app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'retronfc-netplay', salas: rooms.size });
});

app.get('/list', (req, res) => {
    const domain = req.query.domain;
    const gameId = req.query.game_id;

    if (!domain || !gameId) return res.json({});

    const out = {};

    for (const [sessionId, room] of rooms) {
        if (room.domain !== domain || room.gameId !== String(gameId)) continue;

        const owner = Object.values(room.players)
            .find(p => p && p.socketId === room.owner);

        out[sessionId] = {
            room_name: room.roomName,
            current: Object.keys(room.players).length,
            max: room.maxPlayers,
            player_name: (owner && owner.player_name) || 'Unknown',
            hasPassword: !!room.password,
            gameId: room.gameId
        };
    }

    res.json(out);
});

app.get('/games', (req, res) => res.json({}));

io.on('connection', (socket) => {
    socket.join(socket.id);

    socket.on('open-room', (data, ack) => {
        const respond = typeof ack === 'function' ? ack : () => {};
        data = data || {};

        const extra = (data.extra && typeof data.extra === 'object')
            ? Object.assign({}, data.extra)
            : {};

        const sessionId = field(extra, 'sessionid') || '';
        const playerId  = field(extra, 'userid') || field(extra, 'playerId') || '';

        if (!sessionId || !playerId) {
            respond('Invalid data: sessionId and playerId required');
            return;
        }

        if (rooms.has(sessionId)) {
            respond('Room already exists');
            return;
        }

        const maxPlayers = Number(data.maxPlayers) > 0 ? Number(data.maxPlayers) : 4;

        extra.socketId = socket.id;

        const players = {};
        players[playerId] = extra;

        rooms.set(sessionId, {
            owner: socket.id,
            players: players,
            peers: [],
            roomName: field(extra, 'room_name') || ('Room ' + sessionId),
            gameId: field(extra, 'game_id') || 'default',
            domain: field(extra, 'domain') || 'unknown',
            password: normalizePassword(data.password),
            maxPlayers: maxPlayers
        });

        socket.join(sessionId);
        index.set(socket.id, { sessionId: sessionId, playerId: playerId, lastChatAt: 0 });

        respond(null);
        io.to(socket.id).emit('users-updated', players);
    });

    socket.on('join-room', (data, ack) => {
        const respond = typeof ack === 'function' ? ack : () => {};
        data = data || {};

        const extra = (data.extra && typeof data.extra === 'object')
            ? Object.assign({}, data.extra)
            : {};

        const sessionId = field(extra, 'sessionid') || '';
        const playerId  = field(extra, 'userid') || field(extra, 'playerId') || '';

        if (!sessionId || !playerId) {
            respond('Invalid data: sessionId and playerId required');
            return;
        }

        const room = rooms.get(sessionId);

        if (!room) { respond('Room not found'); return; }

        if (room.password && normalizePassword(data.password) !== room.password) {
            respond('Incorrect password');
            return;
        }

        if (Object.keys(room.players).length >= room.maxPlayers) {
            respond('Room full');
            return;
        }

        extra.socketId = socket.id;
        room.players[playerId] = extra;

        socket.join(sessionId);
        index.set(socket.id, { sessionId: sessionId, playerId: playerId, lastChatAt: 0 });

        respond(null, room.players);
        emitMany(socketIdsOf(room), 'users-updated', room.players);
    });

    socket.on('leave-room', () => leaveInternal(socket));
    socket.on('disconnect', () => leaveInternal(socket));

    socket.on('chat-message', (data, ack) => {
        const respond = typeof ack === 'function' ? ack : () => {};

        const idx = index.get(socket.id);
        if (!idx) { respond({ ok: false, error: 'Not in a room' }); return; }

        const agora = Date.now();
        if (agora - idx.lastChatAt < 400) {
            respond({ ok: false, error: 'Slow down' });
            return;
        }
        idx.lastChatAt = agora;

        let to = 'all';
        let message = '';

        if (typeof data === 'string') {
            message = data;
        } else if (data && typeof data === 'object') {
            to = toStr(data.to) || 'all';
            message = typeof data.message === 'string' ? data.message : '';
        }

        message = message.split(/\s+/).filter(Boolean).join(' ').slice(0, 300);

        if (!message) { respond({ ok: false, error: 'Empty message' }); return; }

        to = String(to).trim() || 'all';

        const room = rooms.get(idx.sessionId);
        if (!room) { respond({ ok: false, error: 'Room not found' }); return; }

        const from = room.players[idx.playerId];
        if (!from) { respond({ ok: false, error: 'Not in room' }); return; }

        const ids = socketIdsOf(room);
        const privado = to.toLowerCase() !== 'all' && to !== idx.playerId;

        let alvo = null;
        if (privado) {
            const p = room.players[to];
            if (p && p.socketId) alvo = p.socketId;
            else if (ids.includes(to)) alvo = to;
        }

        const payload = {
            ts: agora,
            to: alvo ? to : 'all',
            userid: idx.playerId,
            player_name: from.player_name || 'Unknown',
            message: message
        };

        if (alvo) {
            io.to(socket.id).emit('chat-message', payload);
            io.to(alvo).emit('chat-message', payload);
        } else {
            emitMany(ids, 'chat-message', payload);
        }

        respond({ ok: true });
    });

    socket.on('webrtc-signal', (data) => {
        data = data || {};

        const sender = socket.id;
        const idx = index.get(sender);
        const request = !!data.requestRenegotiate;

        if (!request && !data.target) return;

        const target = data.target || '';

        if (data.offer && idx) {
            const room = rooms.get(idx.sessionId);
            if (room) {
                const existe = room.peers.some(p => p.source === sender && p.target === target);
                if (!existe) room.peers.push({ source: sender, target: target });
            }
        }

        const payload = { sender: sender };

        if (request) {
            payload.requestRenegotiate = true;
        } else {
            if (data.candidate) payload.candidate = data.candidate;
            if (data.offer)     payload.offer = data.offer;
            if (data.answer)    payload.answer = data.answer;
        }

        io.to(target).emit('webrtc-signal', payload);
    });

    ['data-message', 'snapshot', 'input'].forEach(function (evento) {
        socket.on(evento, (d) => {
            const idx = index.get(socket.id);
            if (!idx) return;

            const room = rooms.get(idx.sessionId);
            if (!room) return;

            emitMany(socketIdsOf(room), evento, d, socket.id);
        });
    });
});

setInterval(() => {
    for (const [sessionId, room] of rooms) {
        if (!Object.keys(room.players).length) rooms.delete(sessionId);
    }
}, 60000);

server.listen(PORT, '0.0.0.0', () => {
    console.log('RETRO NFC netplay ouvindo na porta ' + PORT);
});
