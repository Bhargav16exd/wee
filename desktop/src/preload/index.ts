import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, Profile, Settings, Status } from '@shared/types'

const api = {
  platform: process.platform,
  getState: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
  onState: (cb: (s: AppState) => void): (() => void) => {
    const handler = (_e: unknown, s: AppState): void => cb(s)
    ipcRenderer.on('state:changed', handler)
    return () => ipcRenderer.removeListener('state:changed', handler)
  },
  completeOnboarding: (profile: Profile, password: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('onboarding:complete', profile, password),
  setStatus: (status: Status): Promise<void> => ipcRenderer.invoke('status:set', status),
  setSettings: (settings: Settings): Promise<void> => ipcRenderer.invoke('settings:set', settings),
  retryConnection: (): Promise<void> => ipcRenderer.invoke('connection:retry'),
  resetApp: (): Promise<void> => ipcRenderer.invoke('app:reset'),
  overlayIgnoreMouse: (ignore: boolean): void => ipcRenderer.send('overlay:ignore-mouse', ignore),
  focusMain: (): void => ipcRenderer.send('main:focus'),
  minimize: (): void => ipcRenderer.send('window:minimize'),
  close: (): void => ipcRenderer.send('window:close')
}

export type Api = typeof api
contextBridge.exposeInMainWorld('api', api)
