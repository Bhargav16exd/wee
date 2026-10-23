import { useEffect, useState } from 'react'
import type { AppState } from '@shared/types'

export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null)
  useEffect(() => {
    let alive = true
    void window.api.getState().then((s) => { if (alive) setState(s) })
    const off = window.api.onState((s) => { if (alive) setState(s) })
    return () => { alive = false; off() }
  }, [])
  return state
}

/** "just now", "4 min", "2 h" — re-renders every 30s so it stays honest. */
export function useSince(ts: number): string {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h} h ${m % 60} min`
}
