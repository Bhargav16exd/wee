import { EventEmitter } from 'node:events'
import WebSocket from 'ws'
import type { ClientMessage, ConnectionState, Peer, Profile, ServerMessage, Status } from '@shared/types'
import { SHARED_PASSWORD } from '@shared/constants'

interface ClientOptions {
  url: string
  room: string
  profile: Profile
  status: Status
}

/**
 * WebSocket client living in the main process, so the connection outlives
 * any renderer. Emits: 'connection', 'peers', 'self', 'error'.
 */
export class BuddyClient extends EventEmitter {
  private ws: WebSocket | null = null
  private opts: ClientOptions
  private closedByUs = false
  private retryTimer: NodeJS.Timeout | null = null
  private attempt = 0

  peers = new Map<string, Peer>()
  selfId: string | null = null
  connection: ConnectionState = 'offline'

  constructor(opts: ClientOptions) {
    super()
    this.opts = opts
  }

  connect(): void {
    this.closedByUs = false
    this.clearRetry()
    this.setConnection('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(this.opts.url, { handshakeTimeout: 6000 })
    } catch (err) {
      this.emit('error', (err as Error).message)
      this.scheduleRetry()
      return
    }
    this.ws = ws

    ws.on('open', () => {
      this.attempt = 0
      this.send({
        type: 'join',
        room: this.opts.room,
        password: SHARED_PASSWORD,
        name: this.opts.profile.name,
        character: this.opts.profile.character,
        status: this.opts.status
      })
    })

    ws.on('message', (raw) => {
      let msg: ServerMessage
      try { msg = JSON.parse(raw.toString()) } catch { return }
      this.handle(msg)
    })

    ws.on('error', (err) => {
      this.emit('error', err.message)
    })

    ws.on('close', (code) => {
      if (this.ws !== ws) return
      this.ws = null
      // Mark everyone we knew about as away: with no socket we can't vouch for them.
      for (const p of this.peers.values()) p.online = false
      this.emit('peers', [...this.peers.values()])
      if (code === 4001) {
        this.setConnection('auth-failed')
        return
      }
      this.setConnection('offline')
      if (!this.closedByUs) this.scheduleRetry()
    })
  }

  private handle(msg: ServerMessage): void {
    switch (msg.type) {
      case 'joined':
        this.selfId = msg.self.id
        this.peers = new Map(msg.peers.map((p) => [p.id, { ...p, online: true }]))
        this.setConnection('online')
        this.emit('self', this.selfId)
        this.emit('peers', [...this.peers.values()])
        break
      case 'peer:update':
        this.peers.set(msg.peer.id, { ...msg.peer, online: true })
        this.emit('peers', [...this.peers.values()])
        break
      case 'peer:left':
        this.peers.delete(msg.id)
        this.emit('peers', [...this.peers.values()])
        break
      case 'error':
        this.emit('error', msg.message)
        break
    }
  }

  setStatus(status: Status): void {
    this.opts.status = status
    this.send({ type: 'status', status })
  }

  reconfigure(opts: Partial<ClientOptions>): void {
    this.opts = { ...this.opts, ...opts }
    this.close()
    this.peers.clear()
    this.connect()
  }

  close(): void {
    this.closedByUs = true
    this.clearRetry()
    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.removeAllListeners()
      try { ws.close() } catch { /* ignore */ }
    }
    this.setConnection('offline')
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  private setConnection(c: ConnectionState): void {
    if (this.connection === c) return
    this.connection = c
    this.emit('connection', c)
  }

  private scheduleRetry(): void {
    this.clearRetry()
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.attempt, 5))
    this.attempt++
    this.retryTimer = setTimeout(() => this.connect(), delay)
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }
}
