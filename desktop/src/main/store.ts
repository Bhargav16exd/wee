import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Profile, Settings } from '@shared/types'
import { DEFAULT_ROOM, DEFAULT_SERVER_URL } from '@shared/constants'

export interface Persisted {
  profile: Profile | null
  settings: Settings
  overlayY: number | null
}

const defaults: Persisted = {
  profile: null,
  settings: { serverUrl: DEFAULT_SERVER_URL, room: DEFAULT_ROOM },
  overlayY: null
}

// Tiny JSON store in userData — avoids pulling in electron-store just for three keys.
export class Store {
  private file: string
  private data: Persisted

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'deskbuddy.json')
    this.data = { ...defaults }
    try {
      if (existsSync(this.file)) {
        const parsed = JSON.parse(readFileSync(this.file, 'utf8'))
        this.data = { ...defaults, ...parsed, settings: { ...defaults.settings, ...(parsed.settings ?? {}) } }
      }
    } catch {
      this.data = { ...defaults }
    }
  }

  get<K extends keyof Persisted>(key: K): Persisted[K] {
    return this.data[key]
  }

  set<K extends keyof Persisted>(key: K, value: Persisted[K]): void {
    this.data[key] = value
    writeFileSync(this.file, JSON.stringify(this.data, null, 2))
  }

  reset(): void {
    this.data = { ...defaults }
    writeFileSync(this.file, JSON.stringify(this.data, null, 2))
  }
}
