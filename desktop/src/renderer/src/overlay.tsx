import React from 'react'
import ReactDOM from 'react-dom/client'
import type { Peer } from '@shared/types'
import { STATUS_LABELS } from '@shared/constants'
import { Character } from './components/Character'
import { useAppState } from './hooks/useAppState'
import './styles/global.css'

const MAX_PETS = 3

function Pet({ peer }: { peer: Peer }) {
  const offline = !peer.online
  const pose = offline ? 'away' : peer.status.kind
  return (
    <div
      className={`pet ${offline ? 'offline' : ''}`}
      onMouseEnter={() => window.api.overlayIgnoreMouse(false)}
      onMouseLeave={() => window.api.overlayIgnoreMouse(true)}
      onDoubleClick={() => window.api.focusMain()}
      title="Double-click to open DeskBuddy · drag to move"
    >
      <div className="bubble">
        <div className="nm">{peer.name}</div>
        <div className="st">
          {offline ? 'Away · not connected'
            : peer.status.kind === 'custom' ? <span className="msg">“{peer.status.message}”</span>
            : STATUS_LABELS[peer.status.kind]}
        </div>
      </div>
      <div className="sprite">
        <Character character={peer.character} pose={pose} offline={offline} />
      </div>
    </div>
  )
}

function Overlay() {
  const state = useAppState()
  if (!state || !state.onboarded) return null
  const pets = state.peers.slice(0, MAX_PETS)
  return (
    <div className="overlay-root">
      {pets.length === 0 ? (
        <div
          className="waiting"
          onMouseEnter={() => window.api.overlayIgnoreMouse(false)}
          onMouseLeave={() => window.api.overlayIgnoreMouse(true)}
          onDoubleClick={() => window.api.focusMain()}
        >
          {state.connection === 'online' ? 'Waiting for your buddy…' : state.connection === 'connecting' ? 'Connecting…' : 'Offline'}
        </div>
      ) : (
        pets.map((p) => <Pet key={p.id} peer={p} />)
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>
)
