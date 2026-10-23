import { useEffect, useState } from 'react'
import type { AppState, Peer, StatusKind } from '@shared/types'
import { MAX_CUSTOM_LENGTH, STATUS_LABELS } from '@shared/constants'
import { Character } from '../components/Character'
import { useSince } from '../hooks/useAppState'

const CHIPS: { kind: StatusKind; emoji: string; desc: string }[] = [
  { kind: 'working', emoji: '💻', desc: 'Heads down' },
  { kind: 'meeting', emoji: '🎧', desc: 'On a call' },
  { kind: 'lunch', emoji: '🍜', desc: 'Back soon' },
  { kind: 'coffee', emoji: '☕', desc: 'Quick break' },
  { kind: 'workout', emoji: '🏋️', desc: 'Getting the reps in' },
  { kind: 'sleeping', emoji: '😴', desc: 'Done for the day' },
  { kind: 'away', emoji: '🚶', desc: 'Not at desk' }
]

const CONN_LABEL: Record<AppState['connection'], string> = {
  online: 'Connected',
  connecting: 'Connecting…',
  offline: 'Offline',
  'auth-failed': 'Password rejected'
}

export function statusText(p: { status: Peer['status']; online?: boolean }): string {
  if (p.online === false) return 'Away · not connected'
  if (p.status.kind === 'custom') return p.status.message || 'Custom'
  return STATUS_LABELS[p.status.kind]
}

export function Dashboard({ state }: { state: AppState }) {
  const { profile, status, connection, peers, settings } = state
  const [custom, setCustom] = useState(status.kind === 'custom' ? status.message : '')
  const [showSettings, setShowSettings] = useState(false)
  const since = useSince(status.since)

  useEffect(() => {
    if (status.kind === 'custom') setCustom(status.message)
  }, [status])

  if (!profile) return null

  const setKind = (kind: StatusKind) => void window.api.setStatus({ kind, message: '', since: Date.now() })
  const sendCustom = () => {
    const message = custom.trim()
    if (!message) return
    void window.api.setStatus({ kind: 'custom', message, since: Date.now() })
  }

  return (
    <div className="dashboard">
      <section className="me glass fade-up">
        <div className="stage">
          <Character character={profile.character} pose={status.kind} offline={connection !== 'online'} />
        </div>
        <div className="who">
          <h2>{profile.name}</h2>
          <p>{statusText({ status, online: true })} · {since}</p>
        </div>
        <div className="meta">
          <span className={`pill ${connection}`}>
            <span className="dot" />
            {CONN_LABEL[connection]}
          </span>
          {connection !== 'online' && connection !== 'connecting' && (
            <button className="btn small ghost" onClick={() => void window.api.retryConnection()}>Retry</button>
          )}
        </div>
      </section>

      <div className="right">
        <section className="panel glass fade-up" style={{ animationDelay: '.06s' }}>
          <h3>Your status</h3>
          <div className="status-grid">
            {CHIPS.map((c) => (
              <button key={c.kind} className={`chip ${c.kind} ${status.kind === c.kind ? 'active' : ''}`} onClick={() => setKind(c.kind)} title={c.desc}>
                <span className="emoji">{c.emoji}</span>
                <span className="label">{STATUS_LABELS[c.kind]}</span>
              </button>
            ))}
          </div>
          <div className={`custom-row ${status.kind === 'custom' ? 'active' : ''}`}>
            <input
              className="input"
              placeholder="Say something… “in a call till 3”"
              maxLength={MAX_CUSTOM_LENGTH}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendCustom() }}
            />
            <button className="btn primary" onClick={sendCustom} disabled={!custom.trim()}>Share</button>
          </div>
        </section>

        <section className="panel glass buddies fade-up" style={{ animationDelay: '.12s' }}>
          <h3>
            <span>Buddies · {peers.length}</span>
            <button className="btn small ghost" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          </h3>
          <div className="list">
            {peers.length === 0 && (
              <p className="empty">
                Nobody here yet. Ask your buddy to open DeskBuddy with server <code>{settings.serverUrl}</code> and room <code>{settings.room}</code>.
              </p>
            )}
            {peers.map((p) => (
              <BuddyRow key={p.id} peer={p} />
            ))}
          </div>
          <div className="footer-row">
            <span className="mini-text">{settings.serverUrl} · room “{settings.room}”</span>
            {state.lastError && connection !== 'online' && <span className="mini-text danger">{state.lastError}</span>}
          </div>
        </section>
      </div>

      {showSettings && <SettingsSheet state={state} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function BuddyRow({ peer }: { peer: Peer }) {
  const since = useSince(peer.status.since)
  const offline = !peer.online
  return (
    <div className={`buddy ${offline ? 'offline' : ''}`}>
      <div className="mini">
        <Character character={peer.character} pose={offline ? 'away' : peer.status.kind} offline={offline} />
      </div>
      <div>
        <div className="bname">{peer.name}</div>
        <div className="bstatus">
          {peer.status.kind === 'custom' && peer.online ? <span className="msg">“{peer.status.message}”</span> : statusText(peer)}
          {peer.online && <> · {since}</>}
        </div>
      </div>
      <span className={`pill ${offline ? 'offline' : 'online'}`}><span className="dot" />{offline ? 'away' : 'online'}</span>
    </div>
  )
}

function SettingsSheet({ state, onClose }: { state: AppState; onClose: () => void }) {
  const [serverUrl, setServerUrl] = useState(state.settings.serverUrl)
  const [room, setRoom] = useState(state.settings.room)
  const dirty = serverUrl !== state.settings.serverUrl || room !== state.settings.room

  const save = async () => {
    await window.api.setSettings({ serverUrl, room })
    onClose()
  }
  const reset = async () => {
    if (!confirm('Forget your character and name? You will see the first-launch screen again.')) return
    await window.api.resetApp()
  }

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet glass">
        <h2>Connection</h2>
        <div className="field">
          <label htmlFor="url">Server URL</label>
          <input id="url" className="input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="ws://192.168.1.20:8080" />
        </div>
        <div className="field">
          <label htmlFor="room">Room</label>
          <input id="room" className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="home" />
        </div>
        <div className="actions">
          <button className="btn small ghost danger" onClick={reset}>Reset profile</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small ghost" onClick={onClose}>Cancel</button>
            <button className="btn small primary" onClick={save} disabled={!dirty}>Save &amp; reconnect</button>
          </div>
        </div>
      </div>
    </div>
  )
}
