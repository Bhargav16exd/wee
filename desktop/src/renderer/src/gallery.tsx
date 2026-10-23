import React from 'react'
import ReactDOM from 'react-dom/client'
import { Character, type Pose } from './components/Character'

// Dev-only page: every character × pose, no Electron needed. Not linked from the app.
const POSES: Pose[] = ['idle', 'working', 'meeting', 'lunch', 'coffee', 'workout', 'sleeping', 'away', 'custom']

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="grid">
      {(['boy', 'girl'] as const).map((c) =>
        POSES.map((p) => (
          <div className="cell" key={c + p}>
            <Character character={c} pose={p} size={200} />
            <span>{c} · {p}</span>
          </div>
        ))
      )}
      <div className="cell"><Character character="boy" pose="away" offline size={200} /><span>boy · offline</span></div>
      <div className="cell"><Character character="girl" pose="away" offline size={200} /><span>girl · offline</span></div>
    </div>
  </React.StrictMode>
)
