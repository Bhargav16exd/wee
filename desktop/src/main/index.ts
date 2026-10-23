import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { Store } from './store'
import { BuddyClient } from './socket'
import type { AppState, Profile, Settings, Status } from '@shared/types'
import { SHARED_PASSWORD, MAX_CUSTOM_LENGTH, STATUS_KINDS } from '@shared/constants'

// Keep dev and packaged builds on the same userData folder; DESKBUDDY_PROFILE lets you
// run several instances on one machine (handy for testing both buddies locally).
app.setName('DeskBuddy')
if (process.env.DESKBUDDY_PROFILE) {
  app.setPath('userData', join(app.getPath('appData'), `DeskBuddy-${process.env.DESKBUDDY_PROFILE}`))
}

const isMac = process.platform === 'darwin'
const isDev = !!process.env.ELECTRON_RENDERER_URL

const OVERLAY_W = 130
const OVERLAY_H = 320

let mainWin: BrowserWindow | null = null
let overlayWin: BrowserWindow | null = null
let client: BuddyClient | null = null
const store = new Store()

const state: AppState = {
  onboarded: false,
  profile: null,
  settings: store.get('settings'),
  status: { kind: 'working', message: '', since: Date.now() },
  connection: 'offline',
  peers: [],
  selfId: null,
  lastError: null
}

function hydrate(): void {
  const profile = store.get('profile')
  state.profile = profile
  state.onboarded = !!profile
}

function broadcastState(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('state:changed', state)
  }
}

function rendererUrl(page: 'index' | 'overlay'): { url?: string; file?: string } {
  if (isDev) return { url: `${process.env.ELECTRON_RENDERER_URL}/${page}.html` }
  return { file: join(__dirname, `../renderer/${page}.html`) }
}

function load(win: BrowserWindow, page: 'index' | 'overlay'): void {
  const target = rendererUrl(page)
  if (target.url) void win.loadURL(target.url)
  else void win.loadFile(target.file!)
}

// ---------- windows ----------

function createMainWindow(): void {
  mainWin = new BrowserWindow({
    width: 680,
    height: 540,
    minWidth: 640,
    minHeight: 500,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    roundedCorners: true,
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 14, y: 12 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  mainWin.once('ready-to-show', () => mainWin?.show())
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWin.on('closed', () => {
    mainWin = null
    app.quit()
  })
  load(mainWin, 'index')
}

function createOverlayWindow(): void {
  const { workArea } = screen.getPrimaryDisplay()
  const savedY = store.get('overlayY')
  const y = savedY ?? workArea.y + workArea.height - OVERLAY_H
  overlayWin = new BrowserWindow({
    width: OVERLAY_W,
    height: OVERLAY_H,
    x: workArea.x,
    y: Math.max(workArea.y, y),
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  if (isMac) overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Click-through by default; the renderer turns this off while the cursor is over a pet.
  overlayWin.setIgnoreMouseEvents(true, { forward: true })
  overlayWin.once('ready-to-show', () => overlayWin?.show())
  overlayWin.on('moved', () => {
    if (!overlayWin) return
    const [, ny] = overlayWin.getPosition()
    store.set('overlayY', ny)
  })
  overlayWin.on('closed', () => { overlayWin = null })
  load(overlayWin, 'overlay')
}

// ---------- socket wiring ----------

function startClient(): void {
  if (!state.profile) return
  client?.close()
  client = new BuddyClient({
    url: state.settings.serverUrl,
    room: state.settings.room,
    profile: state.profile,
    status: state.status
  })
  client.on('connection', (c) => {
    state.connection = c
    if (c === 'online') state.lastError = null
    if (c === 'auth-failed') state.lastError = 'Server rejected the password'
    broadcastState()
  })
  client.on('peers', (peers) => {
    state.peers = peers
    broadcastState()
  })
  client.on('self', (id) => {
    state.selfId = id
    broadcastState()
  })
  client.on('error', (message: string) => {
    state.lastError = message
    broadcastState()
  })
  client.connect()
}

// ---------- IPC ----------

function registerIpc(): void {
  ipcMain.handle('state:get', () => state)

  ipcMain.handle('onboarding:complete', (_e, profile: Profile, password: string) => {
    if (password !== SHARED_PASSWORD) return { ok: false, error: 'That password is not right.' }
    const name = profile.name.trim().slice(0, 24)
    if (!name) return { ok: false, error: 'Give your buddy a name.' }
    const clean: Profile = { name, character: profile.character === 'girl' ? 'girl' : 'boy' }
    store.set('profile', clean)
    hydrate()
    broadcastState()
    startClient()
    if (!overlayWin) createOverlayWindow()
    return { ok: true }
  })

  ipcMain.handle('status:set', (_e, status: Status) => {
    const kind = (STATUS_KINDS as readonly string[]).includes(status.kind) ? status.kind : 'working'
    const message = kind === 'custom' ? String(status.message ?? '').trim().slice(0, MAX_CUSTOM_LENGTH) : ''
    state.status = { kind, message, since: Date.now() }
    client?.setStatus(state.status)
    broadcastState()
  })

  ipcMain.handle('settings:set', (_e, settings: Settings) => {
    const serverUrl = settings.serverUrl.trim() || state.settings.serverUrl
    const room = settings.room.trim().slice(0, 32) || 'home'
    state.settings = { serverUrl, room }
    store.set('settings', state.settings)
    state.peers = []
    state.lastError = null
    broadcastState()
    if (client) client.reconfigure({ url: serverUrl, room })
    else startClient()
  })

  ipcMain.handle('connection:retry', () => {
    if (client) client.reconfigure({})
    else startClient()
  })

  ipcMain.handle('app:reset', () => {
    client?.close()
    client = null
    store.reset()
    state.profile = null
    state.onboarded = false
    state.peers = []
    state.connection = 'offline'
    state.selfId = null
    broadcastState()
    overlayWin?.close()
  })

  ipcMain.on('overlay:ignore-mouse', (_e, ignore: boolean) => {
    overlayWin?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  ipcMain.on('main:focus', () => {
    if (!mainWin) return
    if (mainWin.isMinimized()) mainWin.restore()
    mainWin.show()
    mainWin.focus()
  })

  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
}

// ---------- lifecycle ----------

app.whenReady().then(() => {
  hydrate()
  registerIpc()
  createMainWindow()
  if (state.onboarded) {
    startClient()
    createOverlayWindow()
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => client?.close())
