import type { AppState, Profile, Settings, Status } from '@shared/types'
import { DEFAULT_ROOM, DEFAULT_SERVER_URL, SHARED_PASSWORD } from '@shared/constants'

/**
 * Dev-only stand-in for the preload bridge so the renderer can be opened in a plain
 * browser (e.g. `out/renderer/index.html` served statically). Never used inside Electron.
 */
export function installMockApi(): void {
  if (window.api) return
  const listeners = new Set<(s: AppState) => void>()
  const state: AppState = {
    onboarded: false,
    profile: null,
    settings: { serverUrl: DEFAULT_SERVER_URL, room: DEFAULT_ROOM },
    status: { kind: 'working', message: '', since: Date.now() },
    connection: 'online',
    peers: [],
    selfId: 'mock',
    lastError: null
  }
  const emit = (): void => listeners.forEach((cb) => cb({ ...state }))
  const demoPeers = (): AppState['peers'] => [
    { id: 'p1', name: 'Mia', character: state.profile?.character === 'girl' ? 'boy' : 'girl', status: { kind: 'lunch', message: '', since: Date.now() - 5 * 60_000 }, online: true },
    { id: 'p2', name: 'Sam', character: 'boy', status: { kind: 'custom', message: 'deploying, pray for me', since: Date.now() - 60_000 }, online: false }
  ]

  window.api = {
    platform: 'browser' as NodeJS.Platform,
    getState: async () => ({ ...state }),
    onState: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    completeOnboarding: async (profile: Profile, password: string) => {
      if (password !== SHARED_PASSWORD) return { ok: false, error: 'That password is not right.' }
      state.profile = profile
      state.onboarded = true
      state.peers = demoPeers()
      emit()
      return { ok: true }
    },
    setStatus: async (status: Status) => { state.status = { ...status, since: Date.now() }; emit() },
    setSettings: async (settings: Settings) => { state.settings = settings; emit() },
    retryConnection: async () => { state.connection = 'online'; emit() },
    resetApp: async () => { state.profile = null; state.onboarded = false; state.peers = []; emit() },
    overlayIgnoreMouse: () => {},
    focusMain: () => {},
    minimize: () => {},
    close: () => {}
  }
}
