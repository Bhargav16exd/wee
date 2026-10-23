import { useState } from 'react'
import type { CharacterKind } from '@shared/types'
import { Character } from '../components/Character'

export function Onboarding() {
  const [character, setCharacter] = useState<CharacterKind>('boy')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await window.api.completeOnboarding({ name, character }, password)
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'Something went wrong')
  }

  return (
    <div className="onboarding">
      <form className="card glass fade-up" onSubmit={submit}>
        <div>
          <h1>Meet your desk buddy</h1>
          <p className="sub">Pick who sits on your friend&apos;s desktop. You can&apos;t change this later without resetting.</p>
        </div>

        <div className="picker">
          {(['boy', 'girl'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              className={`pick ${kind} ${character === kind ? 'selected' : ''}`}
              onClick={() => setCharacter(kind)}
            >
              <span className="check">✓</span>
              <Character character={kind} pose="idle" size={120} />
              <span className="name">{kind === 'boy' ? 'Boy' : 'Girl'}</span>
              <span className="hint">{kind === 'boy' ? 'messy hair, blue tee' : 'bob cut, pink top'}</span>
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" className="input" placeholder="e.g. Bhargav" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="pw">Room password</label>
            <input id="pw" type="password" className={`input ${error ? 'error' : ''}`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        <div className="actions">
          <span className="error-text">{error}</span>
          <button className="btn primary" type="submit" disabled={busy || !name.trim() || !password}>
            Let&apos;s go →
          </button>
        </div>
      </form>
    </div>
  )
}
