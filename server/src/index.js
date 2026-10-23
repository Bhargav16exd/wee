import http from 'node:http'
import { randomUUID } from 'node:crypto'
import express from 'express'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 8080)
// Hardcoded by design; override with DESKBUDDY_PASSWORD if you ever want to.
const PASSWORD = process.env.DESKBUDDY_PASSWORD || 'buddy123'
const HEARTBEAT_MS = 10_000
const VALID_CHARACTERS = new Set(['boy', 'girl'])
const VALID_STATUS = new Set(['working', 'lunch', 'meeting', 'coffee', 'workout', 'sleeping', 'away', 'custom'])

/** @type {Map<string, Map<string, {ws: import('ws').WebSocket, peer: object}>>} */
const rooms = new Map()

const app = express()
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }))
app.get('/', (_req, res) => {
  const summary = [...rooms.entries()].map(([room, members]) => ({
    room,
    members: [...members.values()].map((m) => ({ name: m.peer.name, status: m.peer.status.kind }))
  }))
  res.type('html').send(`<pre style="font:14px ui-monospace,monospace;padding:24px">DeskBuddy server · ${summary.length} room(s)\n\n${JSON.stringify(summary, null, 2)}</pre>`)
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function broadcast(room, msg, exceptId) {
  const members = rooms.get(room)
  if (!members) return
  for (const [id, m] of members) if (id !== exceptId) send(m.ws, msg)
}

function sanitizeStatus(s) {
  const kind = VALID_STATUS.has(s?.kind) ? s.kind : 'working'
  const message = typeof s?.message === 'string' ? s.message.slice(0, 80) : ''
  const since = Number.isFinite(s?.since) ? s.since : Date.now()
  return { kind, message, since }
}

wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  let room = null
  let id = null

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    if (msg.type === 'join') {
      if (msg.password !== PASSWORD) {
        send(ws, { type: 'error', code: 'bad_password', message: 'Wrong password' })
        return ws.close(4001, 'bad password')
      }
      const name = String(msg.name || 'Buddy').slice(0, 24)
      const character = VALID_CHARACTERS.has(msg.character) ? msg.character : 'boy'
      room = String(msg.room || 'home').slice(0, 32)
      id = randomUUID()

      if (!rooms.has(room)) rooms.set(room, new Map())
      const members = rooms.get(room)
      const peer = { id, name, character, status: sanitizeStatus(msg.status), online: true }
      members.set(id, { ws, peer })

      send(ws, { type: 'joined', self: { id }, peers: [...members.values()].filter((m) => m.peer.id !== id).map((m) => m.peer) })
      broadcast(room, { type: 'peer:update', peer }, id)
      console.log(`[join] ${name} (${character}) → room "${room}" · ${members.size} online`)
      return
    }

    if (msg.type === 'status' && room && id) {
      const member = rooms.get(room)?.get(id)
      if (!member) return
      member.peer.status = sanitizeStatus(msg.status)
      broadcast(room, { type: 'peer:update', peer: member.peer }, id)
      console.log(`[status] ${member.peer.name}: ${member.peer.status.kind} ${member.peer.status.message ? '· ' + member.peer.status.message : ''}`)
    }
  })

  ws.on('close', () => {
    if (!room || !id) return
    const members = rooms.get(room)
    const member = members?.get(id)
    members?.delete(id)
    if (members && members.size === 0) rooms.delete(room)
    broadcast(room, { type: 'peer:left', id })
    if (member) console.log(`[leave] ${member.peer.name} left room "${room}"`)
  })
})

// Heartbeat: a client that misses one ping is considered gone → peers see them as away.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  }
}, HEARTBEAT_MS)
wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, () => {
  console.log(`DeskBuddy server listening on http://localhost:${PORT}  (ws://localhost:${PORT})`)
})
