import { useAppState } from './hooks/useAppState'
import { Onboarding } from './screens/Onboarding'
import { Dashboard } from './screens/Dashboard'
import { TitleBar } from './components/TitleBar'

export function App() {
  const state = useAppState()
  return (
    <div className="app-shell">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <TitleBar />
      {state === null ? null : state.onboarded ? <Dashboard state={state} /> : <Onboarding />}
    </div>
  )
}
