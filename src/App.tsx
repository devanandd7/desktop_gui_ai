import { FormEvent, useState } from 'react'
import {
  Activity, ArrowUp, Bot, Check, ChevronDown, CircleHelp, Clock3, Command,
  Cpu, FileText, History, LayoutGrid, Library, Pause, Play, Plus, Search,
  Settings, ShieldCheck, Sparkles, Square, Terminal, WandSparkles, X,
} from 'lucide-react'

type View = 'workspace' | 'skills' | 'history' | 'settings'
type Step = { number: string; title: string; detail: string; state: 'done' | 'active' | 'queued' }

const steps: Step[] = [
  { number: '01', title: 'Inspect the workspace', detail: 'Reading project context and available windows', state: 'done' },
  { number: '02', title: 'Draft a response', detail: 'Preparing a concise implementation plan', state: 'active' },
  { number: '03', title: 'Request confirmation', detail: 'Waiting before an external action', state: 'queued' },
]

const navItems: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { id: 'skills', label: 'Skill library', icon: Library },
  { id: 'history', label: 'Run history', icon: History },
]

function App() {
  const [view, setView] = useState<View>('workspace')
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(true)
  const [approved, setApproved] = useState(false)

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    if (task.trim()) setRunning(true)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Command size={17} /></div><span>relay</span><span className="brand-version">alpha</span></div>
        <button className="new-run" onClick={() => { setView('workspace'); setTask('') }}><Plus size={16} /> New run <span>⌘ K</span></button>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button className={view === id ? 'nav-item selected' : 'nav-item'} key={id} onClick={() => setView(id)}><Icon size={17} />{label}{id === 'workspace' && <i className="live-dot" />}</button>)}
        </nav>
        <div className="sidebar-label">Workspace</div>
        <div className="workspace-card"><div className="workspace-icon"><Terminal size={15} /></div><div><strong>Desktop agent</strong><small>Local environment</small></div><ChevronDown size={14} className="muted-icon" /></div>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => setView('settings')}><Settings size={17} />Settings</button><button className="nav-item"><CircleHelp size={17} />Help center</button><div className="user-row"><div className="avatar">AS</div><div><strong>Alex Smith</strong><small>Personal workspace</small></div><MoreDots /></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="crumb"><span>Workspace</span><span className="slash">/</span><strong>{view === 'workspace' ? 'Current run' : navItems.find((item) => item.id === view)?.label ?? 'Settings'}</strong></div><div className="top-actions"><div className="system-status"><span className="status-pulse" /> Core online</div><button className="icon-button" aria-label="Search"><Search size={17} /></button><button className="icon-button" aria-label="Activity"><Activity size={17} /></button></div></header>
        {view === 'workspace' ? <Workspace running={running} approved={approved} onApprove={() => setApproved(true)} onPause={() => setRunning(!running)} /> : <PlaceholderView view={view} />}
      </main>

      <form className="composer" onSubmit={submitTask}><div className="composer-top"><div className="composer-agent"><div className="mini-avatar"><Bot size={15} /></div><span>Relay agent</span><span className="model-pill">Gemini · balanced</span></div><button type="button" className="composer-action"><Sparkles size={15} /> Enhance</button></div><textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Tell Relay what you want to do..." rows={2} /><div className="composer-bottom"><div className="composer-hints"><span><WandSparkles size={14} /> Attach skill</span><span><FileText size={14} /> Add context</span></div><button className="send-button" aria-label="Run task" type="submit"><ArrowUp size={18} /></button></div></form>
    </div>
  )
}

function Workspace({ running, approved, onApprove, onPause }: { running: boolean; approved: boolean; onApprove: () => void; onPause: () => void }) {
  return <div className="content"><section className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line" /> RUN 0248 · JUST NOW</div><h1>Prepare the project<br /><em>for its next chapter.</em></h1><p className="hero-copy">Relay is working through your request with visibility at every step.</p></div><div className="run-controls"><button className="control-button" onClick={onPause}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Pause run' : 'Resume run'}</button><button className="stop-button"><Square size={13} /> Stop</button></div></section>
    <div className="content-grid"><section className="plan-panel panel"><div className="panel-heading"><div><span className="section-kicker">EXECUTION PLAN</span><h2>Getting things in order</h2></div><span className="step-count">2 of 3</span></div><div className="progress-track"><span /></div><div className="step-list">{steps.map((step) => <div className={`step ${step.state}`} key={step.number}><div className="step-marker">{step.state === 'done' ? <Check size={13} /> : step.number}</div><div className="step-copy"><strong>{step.title}</strong><span>{step.detail}</span></div>{step.state === 'active' && <span className="working-label"><i /> Working</span>}</div>)}</div><button className="details-button">View full plan <ArrowUp size={14} className="rotate-45" /></button></section>
      <section className="activity-panel panel"><div className="panel-heading"><div><span className="section-kicker">LIVE ACTIVITY</span><h2>What Relay sees</h2></div><span className="streaming"><i /> Streaming</span></div><div className="screen-preview"><div className="preview-toolbar"><span className="traffic red" /><span className="traffic yellow" /><span className="traffic green" /><span className="preview-url">local://desktop-agent</span><span className="preview-lock"><ShieldCheck size={12} /> Safe mode</span></div><div className="preview-body"><div className="preview-line wide" /><div className="preview-line medium" /><div className="preview-block"><div className="preview-line short" /><div className="preview-line wide" /></div><div className="cursor"><span /></div></div></div><div className="activity-event"><div className="event-icon"><Cpu size={14} /></div><div><strong>Reasoning about next action</strong><span>“I found the project folder and I’m checking its current shape before making changes.”</span></div><time>12:42:08</time></div></section></div>
    <section className="approval-banner"><div className="approval-icon"><ShieldCheck size={19} /></div><div className="approval-copy"><strong>Relay needs your approval</strong><span>It wants to open the project folder in your editor. No files will be changed.</span></div>{approved ? <span className="approved"><Check size={14} /> Approved</span> : <button className="approve-button" onClick={onApprove}>Review & approve <ArrowUp size={14} className="rotate-45" /></button>}<button className="dismiss-button" aria-label="Dismiss"><X size={16} /></button></section>
    <div className="lower-grid"><div className="mini-panel"><span className="section-kicker">RUN COST</span><strong>$0.014</strong><span>estimated · 1,240 tokens</span></div><div className="mini-panel"><span className="section-kicker">SAFETY</span><strong className="safe-text"><ShieldCheck size={17} /> All clear</strong><span>Prompt injection guard active</span></div><div className="mini-panel"><span className="section-kicker">ELAPSED</span><strong>00:24</strong><span>Started at 12:41:44</span></div></div>
  </div>
}

function PlaceholderView({ view }: { view: View }) { const title = view === 'skills' ? 'Skill library' : view === 'history' ? 'Run history' : 'Settings'; return <div className="placeholder content"><div className="eyebrow"><span className="eyebrow-line" /> RELAY CONTROL ROOM</div><h1>{title}</h1><p className="hero-copy">This area is ready for the next layer of your local agent workflow.</p><div className="placeholder-panel panel"><Library size={20} /><strong>Coming into focus</strong><span>The backend protocol and local storage are prepared for this surface.</span></div></div> }
function MoreDots() { return <span className="more-dots"><i /><i /><i /></span> }

export default App