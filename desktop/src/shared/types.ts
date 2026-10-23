export type CharacterKind = 'boy' | 'girl'
export type StatusKind = 'working' | 'lunch' | 'meeting' | 'coffee' | 'workout' | 'sleeping' | 'away' | 'custom'
export type ConnectionState = 'connecting' | 'online' | 'offline' | 'auth-failed'

export interface Status {
  kind: StatusKind
  message: string
  since: number
}

export interface Profile {
  name: string
  character: CharacterKind
}

export interface Peer extends Profile {
  id: string
  status: Status
  online: boolean
}

export interface Settings {
  serverUrl: string
  room: string
}

export interface AppState {
  onboarded: boolean
  profile: Profile | null
  settings: Settings
  status: Status
  connection: ConnectionState
  peers: Peer[]
  selfId: string | null
  lastError: string | null
}

// ---- wire protocol (JSON over WebSocket) ----
export type ClientMessage =
  | { type: 'join'; room: string; password: string; name: string; character: CharacterKind; status: Status }
  | { type: 'status'; status: Status }

export type ServerMessage =
  | { type: 'joined'; self: { id: string }; peers: Peer[] }
  | { type: 'peer:update'; peer: Peer }
  | { type: 'peer:left'; id: string }
  | { type: 'error'; code: string; message: string }
