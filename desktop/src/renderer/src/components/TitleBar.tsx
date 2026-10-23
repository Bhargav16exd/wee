export function TitleBar() {
  const isMac = window.api.platform === 'darwin'
  return (
    <header className={`titlebar ${isMac ? 'mac' : ''}`}>
      <div className="brand">
        <span className="brand-dot" />
        DeskBuddy
      </div>
      {!isMac && (
        <div className="win-controls">
          <button aria-label="Minimize" onClick={() => window.api.minimize()}>–</button>
          <button aria-label="Close" className="close" onClick={() => window.api.close()}>×</button>
        </div>
      )}
    </header>
  )
}
