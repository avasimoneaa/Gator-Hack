'use client'

import { useEffect, useRef, useState } from 'react'

type View =
  | 'login'
  | 'smile'
  | 'calibrate'
  | 'scan'
  | 'home'
  | 'messages'
  | 'calendar'
  | 'more'
  | 'button-settings'
  | 'workflow-create'
  | 'workflow-review'
  | 'calendar-add'
  | 'routines'
  | 'appointments'
  | 'appointment-type'
  | 'urgency'
  | 'time'
  | 'transport'
  | 'confirm'
  | 'feature'
  | 'active'

const history: Record<View, View | null> = {
  login: null,
  smile: 'login',
  calibrate: 'login',
  scan: 'login',
  home: null,
  messages: 'home',
  calendar: 'home',
  more: 'home',
  'button-settings': 'home',
  'workflow-create': 'home',
  'workflow-review': 'workflow-create',
  'calendar-add': 'calendar',
  routines: 'home',
  appointments: 'routines',
  'appointment-type': 'appointments',
  urgency: 'appointment-type',
  time: 'urgency',
  transport: 'time',
  confirm: 'transport',
  feature: null,
  active: 'appointments',
}

function HomeIcon({ type }: { type: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'messages') return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="15" width="46" height="34" rx="5" {...common} /><path d="m11 19 21 17 21-17" {...common} /></svg>
  if (type === 'errand') return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 25h40l-5 25H17zM22 25c1-9 19-9 20 0" {...common} /><path d="M24 34v9M40 34v9" {...common} /></svg>
  if (type === 'calendar') return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="14" width="40" height="38" rx="5" {...common} /><path d="M12 25h40M22 9v10M42 9v10M23 35h2M32 35h2M41 35h2M23 43h2M32 43h2" {...common} /></svg>
  if (type === 'internet') return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="31" r="20" {...common} /><path d="M12 31h40M32 11c10 11 10 29 0 40M32 11c-10 11-10 29 0 40M10 54h44" {...common} /></svg>
  if (type === 'health') return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="20" width="44" height="32" rx="6" {...common} /><path d="M24 20v-7h16v7M27 28h10v7h7v10h-7v7H27v-7h-7V35h7z" {...common} /></svg>
  if (type === 'settings') return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="10" {...common} /><circle cx="32" cy="32" r="22" strokeDasharray="7 6" {...common} /></svg>
  if (type === 'routines') return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 46h48M28 45a13 13 0 0 1 26 0M12 25h16v17H12zM28 29h4a6 6 0 0 1 0 12h-4" {...common} /><path d="M41 18v-6M51 23l4-4" {...common} /></svg>
  if (type === 'create workflow') return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="23" width="28" height="26" rx="5" {...common} /><rect x="20" y="15" width="28" height="26" rx="5" {...common} /><path d="M44 50h14M52 44l6 6-6 6" {...common} /></svg>
  if (type === 'help') return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" {...common} /><text x="32" y="42" textAnchor="middle" fontSize="32" fontWeight="700" fill="currentColor">?</text></svg>
  if (type === '← back') return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M38 15 21 32l17 17M22 32h31" {...common} /></svg>
  return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="14" width="36" height="36" rx="8" {...common} /><path d="M24 32h16M32 24v16" {...common} /></svg>
}

function Tile({
  label,
  muted,
  badge,
  back = false,
  disabled = false,
  icon,
  illustrated = false,
  dwellEnabled = true,
  onClick,
}: {
  label: string
  muted?: boolean
  badge?: string
  back?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  illustrated?: boolean
  dwellEnabled?: boolean
  onClick?: () => void
}) {
  const [dwelling, setDwelling] = useState(false)

  useEffect(() => {
    if (!dwelling || !onClick || !label || disabled || !dwellEnabled) return
    const timer = window.setTimeout(() => {
      setDwelling(false)
      onClick()
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [disabled, dwellEnabled, dwelling, label, onClick])

  return (
    <button
      className={`tile ${muted ? 'tile--muted' : ''} ${back ? 'tile--back' : ''} ${label === 'health' ? 'tile--health' : ''} ${dwelling ? 'tile--dwelling' : ''}`}
      disabled={!label || disabled}
      onClick={onClick}
      onPointerEnter={(event) => event.pointerType !== 'touch' && !disabled && dwellEnabled && setDwelling(true)}
      onPointerLeave={() => setDwelling(false)}
      onFocus={() => setDwelling(false)}
      aria-label={label || 'Unavailable'}
    >
      {badge && <span className="badge">{badge}</span>}
      {label === 'health' && !illustrated && <img className="health-illustration" src="/assets/0d269.png" alt="" />}
      {icon && <span className="home-icon">{icon}</span>}
      <span className="tile-label">{label}</span>
      {label && <i className="dwell-track" aria-hidden="true"><i /></i>}
    </button>
  )
}

function GazeAction({
  children,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  const [dwelling, setDwelling] = useState(false)

  useEffect(() => {
    if (!dwelling || disabled) return
    const timer = window.setTimeout(() => {
      setDwelling(false)
      onClick()
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [disabled, dwelling, onClick])

  return (
    <button
      className={`gaze-action ${active ? 'gaze-action--active' : ''} ${dwelling ? 'gaze-action--dwelling' : ''} ${className}`}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerEnter={(event) => event.pointerType !== 'touch' && !disabled && setDwelling(true)}
      onPointerLeave={() => setDwelling(false)}
    >
      {children}
      <i aria-hidden="true"><i /></i>
    </button>
  )
}

function ScrollBox({
  children,
  className = '',
  ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ overflow: false, up: false, down: false })

  const updateScrollState = () => {
    const element = contentRef.current
    if (!element) return
    const overflow = element.scrollHeight > element.clientHeight + 2
    setScrollState({
      overflow,
      up: element.scrollTop > 2,
      down: overflow && element.scrollTop + element.clientHeight < element.scrollHeight - 2,
    })
  }

  useEffect(() => {
    const element = contentRef.current
    if (!element) return
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(element)
    Array.from(element.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [children])

  const scroll = (direction: number) => {
    const element = contentRef.current
    if (!element) return
    element.scrollBy({ top: direction * element.clientHeight * .72, behavior: 'smooth' })
    window.setTimeout(updateScrollState, 350)
  }

  return (
    <div className={`scroll-box ${scrollState.overflow ? 'scroll-box--overflow' : ''} ${className}`}>
      <div ref={contentRef} className="scroll-box-content" onScroll={updateScrollState} aria-label={ariaLabel}>
        {children}
      </div>
      {scrollState.overflow && (
        <div className="scroll-box-controls">
          <GazeAction disabled={!scrollState.up} onClick={() => scroll(-1)} ariaLabel="Scroll up">↑</GazeAction>
          <GazeAction disabled={!scrollState.down} onClick={() => scroll(1)} ariaLabel="Scroll down">↓</GazeAction>
        </div>
      )}
    </div>
  )
}

function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return <GazeAction className="back" onClick={onClick}>← {label}</GazeAction>
}

type Feature = 'morning' | 'catch up' | 'messages' | 'errand' | 'calendar' | 'internet' | 'health'

const featureFlows: Record<Feature, string[]> = {
  morning: ['today overview', 'medications', 'transportation'],
  'catch up': ['messages', 'calendar', 'tasks'],
  messages: ['read new', 'send message', 'return call'],
  errand: ['groceries', 'pharmacy', 'package'],
  calendar: ['today', 'new event', 'upcoming'],
  internet: ['search web', 'weather', 'news'],
  health: ['appointments', 'medications', 'insurance'],
}

const secondSteps: Record<Feature, Record<string, string[]>> = {
  morning: {
    'today overview': ['start now', 'later'],
    medications: ['check today', 'request refill'],
    transportation: ['check rides', 'book ride'],
  },
  'catch up': {
    messages: ['important only', 'everything'],
    calendar: ['today', 'this week'],
    tasks: ['important only', 'everything'],
  },
  messages: {
    'read new': ['read aloud', 'next message'],
    'send message': ['family', 'doctor office', 'care team'],
    'return call': ['family', 'doctor office', 'care team'],
  },
  errand: {
    groceries: ['today', 'tomorrow'],
    pharmacy: ['today', 'tomorrow'],
    package: ['send package', 'track package'],
  },
  calendar: {
    today: ['read aloud', 'show details'],
    'new event': ['morning', 'afternoon', 'evening'],
    upcoming: ['this week', 'this month'],
  },
  internet: {
    'search web': ['type search', 'recent search'],
    weather: ['today', 'this week'],
    news: ['top stories', 'local'],
  },
  health: {
    appointments: ['new appointment', 'manage appointments'],
    medications: ['check today', 'request refill'],
    insurance: ['check coverage', 'find provider'],
  },
}

const calibrationPoints = ['center', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left']

type MessageChannel = 'text' | 'email' | 'call'
type MessageFilter = 'all' | MessageChannel | 'summaries'

const sampleMessages = [
  {
    id: 1,
    person: 'Doctor office',
    channel: 'text' as MessageChannel,
    time: '10:42 AM',
    preview: 'Your appointment is confirmed for October 25 at 3:00 PM.',
    summary: 'Appointment confirmed. No action needed.',
    routine: true,
    tag: 'appointments',
    date: 'today',
  },
  {
    id: 2,
    person: 'Maya',
    channel: 'text' as MessageChannel,
    time: '9:15 AM',
    preview: 'I can take you to your appointment next week.',
    summary: 'Maya offered transportation for next week.',
    routine: false,
    tag: 'family',
    date: 'today',
  },
  {
    id: 3,
    person: 'City Medical',
    channel: 'email' as MessageChannel,
    time: 'Yesterday',
    preview: 'We received your specialist referral and will call with available times.',
    summary: 'Referral received. City Medical will follow up.',
    routine: true,
    tag: 'health',
    date: 'week',
  },
  {
    id: 4,
    person: 'Neighborhood Pharmacy',
    channel: 'call' as MessageChannel,
    time: 'Monday',
    preview: 'Voicemail: Your prescription is ready for pickup.',
    summary: 'Prescription is ready.',
    routine: true,
    tag: 'health',
    date: 'week',
  },
]

type CalendarEvent = {
  id: number
  title: string
  date: string
  day: string
  time: string
  detail: string
  source: string
}

const initialCalendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'Primary doctor',
    date: 'October 25',
    day: 'Wednesday',
    time: '3:00 PM',
    detail: 'Appointment confirmed. Transportation will be coordinated.',
    source: 'Doctor office message',
  },
  {
    id: 2,
    title: 'Prescription pickup',
    date: 'October 26',
    day: 'Thursday',
    time: '11:00 AM',
    detail: 'Prescription is ready at Neighborhood Pharmacy.',
    source: 'Pharmacy call',
  },
]

export default function HomePage() {
  const [view, setView] = useState<View>('login')
  const [progress, setProgress] = useState(0)
  const [faceDwelling, setFaceDwelling] = useState(false)
  const [feature, setFeature] = useState<Feature>('messages')
  const [featureStep, setFeatureStep] = useState(0)
  const [featureOrigin, setFeatureOrigin] = useState<View>('home')
  const [featureChoice, setFeatureChoice] = useState('')
  const [completion, setCompletion] = useState('Added to calendar')
  const [notice, setNotice] = useState('')
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [targetDwelling, setTargetDwelling] = useState(false)
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all')
  const [selectedMessageId, setSelectedMessageId] = useState(1)
  const [messageMode, setMessageMode] = useState<'message' | 'history' | 'summary' | 'compose' | 'route' | 'forward' | 'write' | 'keyboard' | 'builder'>('message')
  const [composeContact, setComposeContact] = useState('Family')
  const [autoReply, setAutoReply] = useState(true)
  const [searchBy, setSearchBy] = useState<'tag' | 'date'>('tag')
  const [tagFilter, setTagFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const [keyboardPage, setKeyboardPage] = useState(0)
  const [calendarView, setCalendarView] = useState<'day' | 'day-detail' | 'week' | 'month'>('week')
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [selectedEventId, setSelectedEventId] = useState(1)
  const [calendarDay, setCalendarDay] = useState(25)
  const [buttonCount, setButtonCount] = useState<4 | 6 | 9 | 16>(9)
  const [gridPage, setGridPage] = useState(0)
  const [theme, setTheme] = useState<'blue' | 'dark' | 'warm' | 'contrast'>('blue')
  const [boxSpacing, setBoxSpacing] = useState<'compact' | 'normal' | 'wide'>('normal')
  const [buttonFontSize, setButtonFontSize] = useState<'small' | 'normal' | 'large'>('normal')
  const [homeStyle, setHomeStyle] = useState<'classic' | 'illustrated' | 'sidebar'>('sidebar')
  const [gazePaused, setGazePaused] = useState(false)
  const [readPolicy, setReadPolicy] = useState<'seen' | 'manual'>('seen')
  const [unreadMessages, setUnreadMessages] = useState<number[]>(sampleMessages.map((message) => message.id))
  const [customWorkflows, setCustomWorkflows] = useState<string[]>([])
  const [workflowPrompt, setWorkflowPrompt] = useState('')
  const [workflowKeyboardPage, setWorkflowKeyboardPage] = useState(0)
  const [workflowKeyboard, setWorkflowKeyboard] = useState(false)
  const [calendarAddStep, setCalendarAddStep] = useState(0)
  const [calendarAddType, setCalendarAddType] = useState('event')
  const [calendarAddDate, setCalendarAddDate] = useState('October 25')

  useEffect(() => {
    const savedCount = window.localStorage.getItem('twinly-button-count')
    if (savedCount === '4' || savedCount === '6' || savedCount === '9' || savedCount === '16') {
      setButtonCount(Number(savedCount) as 4 | 6 | 9 | 16)
    }
    const savedTheme = window.localStorage.getItem('twinly-theme')
    if (savedTheme === 'blue' || savedTheme === 'dark' || savedTheme === 'warm' || savedTheme === 'contrast') setTheme(savedTheme)
    const savedSpacing = window.localStorage.getItem('twinly-box-spacing')
    if (savedSpacing === 'compact' || savedSpacing === 'normal' || savedSpacing === 'wide') setBoxSpacing(savedSpacing)
    const savedFontSize = window.localStorage.getItem('twinly-button-font-size')
    if (savedFontSize === 'small' || savedFontSize === 'normal' || savedFontSize === 'large') setButtonFontSize(savedFontSize)
    const savedHomeStyle = window.localStorage.getItem('twinly-home-style')
    if (savedHomeStyle === 'classic' || savedHomeStyle === 'illustrated' || savedHomeStyle === 'sidebar') setHomeStyle(savedHomeStyle)
    const savedPolicy = window.localStorage.getItem('twinly-read-policy')
    if (savedPolicy === 'seen' || savedPolicy === 'manual') setReadPolicy(savedPolicy)
    const savedWorkflows = window.localStorage.getItem('twinly-custom-workflows')
    if (savedWorkflows) setCustomWorkflows(JSON.parse(savedWorkflows))
  }, [])

  useEffect(() => {
    window.localStorage.setItem('twinly-button-count', String(buttonCount))
  }, [buttonCount])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('twinly-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.spacing = boxSpacing
    window.localStorage.setItem('twinly-box-spacing', boxSpacing)
  }, [boxSpacing])

  useEffect(() => {
    document.documentElement.dataset.fontSize = buttonFontSize
    window.localStorage.setItem('twinly-button-font-size', buttonFontSize)
  }, [buttonFontSize])

  useEffect(() => {
    window.localStorage.setItem('twinly-home-style', homeStyle)
  }, [homeStyle])

  useEffect(() => {
    window.localStorage.setItem('twinly-read-policy', readPolicy)
  }, [readPolicy])

  useEffect(() => {
    window.localStorage.setItem('twinly-custom-workflows', JSON.stringify(customWorkflows))
  }, [customWorkflows])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (view === 'messages' && readPolicy === 'seen') {
      setUnreadMessages((ids) => ids.filter((id) => id !== selectedMessageId))
    }
  }, [readPolicy, selectedMessageId, view])

  useEffect(() => {
    if (view !== 'scan') return
    setProgress(10)
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer)
          window.setTimeout(() => setView('home'), 200)
          return 100
        }
        return value + 10
      })
    }, 80)
    return () => window.clearInterval(timer)
  }, [view])

  useEffect(() => {
    setGridPage(0)
  }, [buttonCount, view])

  useEffect(() => {
    if (view !== 'smile') return
    const timer = window.setTimeout(() => {
      setCalibrationStep(0)
      setView('calibrate')
    }, 750)
    return () => window.clearTimeout(timer)
  }, [view])

  useEffect(() => {
    if (view !== 'login' || !faceDwelling) return
    const timer = window.setTimeout(() => {
      setFaceDwelling(false)
      setView('smile')
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [faceDwelling, view])

  const advanceCalibration = () => {
    setTargetDwelling(false)
    if (calibrationStep === calibrationPoints.length - 1) setView('scan')
    else setCalibrationStep((step) => step + 1)
  }

  useEffect(() => {
    if (view !== 'calibrate' || !targetDwelling) return
    const timer = window.setTimeout(advanceCalibration, 900)
    return () => window.clearTimeout(timer)
  }, [calibrationStep, targetDwelling, view])

  if (view === 'calibrate') {
    const point = calibrationPoints[calibrationStep]
    return (
      <main className="shell calibration-screen">
        <BackButton onClick={() => setView('login')} />
        <GazeAction className="developer-skip" onClick={() => setView('home')}>Developer skip</GazeAction>
        <p>Look at each dot</p>
        <button
          className={`calibration-target calibration-target--${point} ${targetDwelling ? 'calibration-target--dwelling' : ''}`}
          onClick={advanceCalibration}
          onPointerEnter={(event) => event.pointerType !== 'touch' && setTargetDwelling(true)}
          onPointerLeave={() => setTargetDwelling(false)}
          aria-label={`Calibration point ${calibrationStep + 1} of ${calibrationPoints.length}`}
        >
          <span />
        </button>
        <div className="calibration-progress" aria-live="polite">{calibrationStep + 1} / {calibrationPoints.length}</div>
      </main>
    )
  }

  if (view === 'login' || view === 'smile' || view === 'scan') {
    const scanning = view === 'scan'
    const smiling = view === 'smile'
    return (
      <main className="shell login-screen">
        {view !== 'login' && <BackButton onClick={() => setView('login')} />}
        <GazeAction className="developer-skip" onClick={() => setView('home')}>Developer skip</GazeAction>
        <h1>Twinly Gaze Connector</h1>
        <button
          className={`face-login ${scanning || smiling ? 'face-login--active' : ''} ${faceDwelling ? 'face-login--dwelling' : ''}`}
          onClick={() => view === 'login' && setView('smile')}
          onPointerEnter={(event) => event.pointerType !== 'touch' && view === 'login' && setFaceDwelling(true)}
          onPointerLeave={() => setFaceDwelling(false)}
          aria-label="Login with face"
          aria-pressed={smiling}
        >
          {scanning ? <img className="camera-face" src="/assets/login-face.png" alt="Face detected" /> : (
            <span className="face">
              <img className="face-shape" src="/assets/c54b1.svg" alt="" />
              <img className="eye eye--left" src="/assets/df5e6.svg" alt="" />
              <img className="eye eye--right" src="/assets/df5e6.svg" alt="" />
              <img className={`mouth ${smiling ? 'mouth--smile' : ''}`} src={smiling ? '/assets/30932.svg' : '/assets/60973.svg'} alt="" />
            </span>
          )}
          {view === 'login' && <i className="login-dwell" aria-hidden="true"><i /></i>}
        </button>
        {scanning ? (
          <div className="scan-status"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>Confirming your gaze…</p></div>
        ) : (
          <p className="login-label" aria-live="polite">{smiling ? 'Hello! Starting face login…' : faceDwelling ? 'Keep looking to log in…' : 'Login with face'}</p>
        )}
      </main>
    )
  }

  if (view === 'active') {
    return (
      <main className="shell active-screen">
        <BackButton onClick={() => setView('home')} label="Home" />
        <div className="active-card">
          <span className="complete-check">✓</span>
          <h1>Task completed</h1>
          <p className="completion-message">{completion}</p>
        </div>
      </main>
    )
  }

  if (view === 'workflow-create' || view === 'workflow-review') {
    const workflowCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '.slice(workflowKeyboardPage * 4, workflowKeyboardPage * 4 + 4).split('')
    const confirmWorkflow = () => {
      const name = workflowPrompt.trim() || 'New workflow'
      setCustomWorkflows((workflows) => workflows.includes(name) ? workflows : [...workflows, name])
      setNotice('Workflow added')
      setView('home')
    }

    return (
      <main className="shell workflow-creator">
        <BackButton onClick={() => view === 'workflow-review' ? setView('workflow-create') : setView('home')} />
        {notice && <div className="inline-notice">✓ {notice}</div>}
        {view === 'workflow-review' ? (
          <section className="workflow-review-card">
            <p className="detail-label">New workflow</p>
            <h1>{workflowPrompt || 'New workflow'}</h1>
            <p>Twinly will gather the needed information, complete each step, and ask before any important action.</p>
            <div className="workflow-review-actions">
              <GazeAction onClick={() => { setWorkflowKeyboard(true); setView('workflow-create') }}>Suggest changes</GazeAction>
              <GazeAction onClick={confirmWorkflow}>Confirm and add</GazeAction>
              <GazeAction onClick={() => setView('home')}>Cancel</GazeAction>
            </div>
          </section>
        ) : (
          <section className="workflow-review-card">
            <p className="detail-label">Create with AI</p>
            <h1>{workflowPrompt || 'What should Twinly do?'}</h1>
            {!workflowKeyboard ? (
              <div className="workflow-suggestions">
                {['Call family every Friday', 'Order my groceries', 'Read my morning updates'].map((suggestion) => (
                  <GazeAction key={suggestion} onClick={() => { setWorkflowPrompt(suggestion); setView('workflow-review') }}>{suggestion}</GazeAction>
                ))}
                <GazeAction onClick={() => { setWorkflowPrompt(''); setWorkflowKeyboard(true); setWorkflowKeyboardPage(0) }}>Use keyboard</GazeAction>
              </div>
            ) : (
              <div className="workflow-keyboard">
                {workflowCharacters.map((character, index) => (
                  <GazeAction key={`${character}-${index}`} onClick={() => setWorkflowPrompt((text) => text + character)}>{character === ' ' ? 'Space' : character}</GazeAction>
                ))}
                <GazeAction onClick={() => setWorkflowKeyboardPage((page) => (page + 1) % 7)}>Next keys</GazeAction>
                <GazeAction disabled={!workflowPrompt.trim()} onClick={() => setView('workflow-review')}>Review</GazeAction>
              </div>
            )}
          </section>
        )}
      </main>
    )
  }

  if (view === 'messages') {
    const filteredMessages = sampleMessages.filter((message) => {
      const channelMatches = messageFilter === 'all' || messageFilter === 'summaries' || message.channel === messageFilter
      const tagMatches = tagFilter === 'all' || message.tag === tagFilter
      const dateMatches = dateFilter === 'all' || message.date === dateFilter || (dateFilter === 'week' && ['today', 'week'].includes(message.date))
      return channelMatches && tagMatches && dateMatches
    })
    const selectedMessage = sampleMessages.find((message) => message.id === selectedMessageId) ?? sampleMessages[0]
    const markRead = (id: number) => setUnreadMessages((ids) => ids.filter((messageId) => messageId !== id))
    const setFilter = (filter: MessageFilter) => {
      setMessageFilter(filter)
      const first = filter === 'all' || filter === 'summaries'
        ? sampleMessages[0]
        : sampleMessages.find((message) => message.channel === filter)
      if (first) setSelectedMessageId(first.id)
      setMessageMode(filter === 'summaries' ? 'summary' : 'message')
    }
    const prepareMessage = (text: string) => {
      setDraft(text)
      setNotice('Message prepared')
      setMessageMode('message')
    }
    const beginWriting = (contact: string) => {
      setComposeContact(contact)
      setDraft('')
      setMessageMode('write')
    }
    const keyboardCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '.slice(keyboardPage * 4, keyboardPage * 4 + 4).split('')
    const builderWords = !draft
      ? ['I', 'Yes', 'No', 'Please', 'Thank you']
      : draft.endsWith('I')
        ? ['can', 'will', 'need', 'am', 'cannot']
        : ['come', 'call', 'confirm', 'help', 'tomorrow']

    return (
      <main className="shell messages-screen">
        {notice && <div className="inline-notice">✓ {notice}</div>}
        <header className="messages-header">
          <BackButton onClick={() => setView('home')} />
          <h1>Messages</h1>
          <GazeAction active={autoReply} onClick={() => setAutoReply((enabled) => !enabled)}>Auto reply {autoReply ? 'on' : 'off'}</GazeAction>
          <GazeAction className="new-message" onClick={() => { setMessageMode('compose'); setDraft('') }}>New message</GazeAction>
        </header>

        <nav className="message-filters" aria-label="Message types">
          {(['all', 'text', 'email', 'call', 'summaries'] as MessageFilter[]).map((filter) => (
            <GazeAction key={filter} active={messageFilter === filter} disabled={messageFilter === filter} onClick={() => setFilter(filter)}>
              {filter === 'all' ? 'All' : filter === 'text' ? 'Texts' : filter === 'email' ? 'Emails' : filter === 'call' ? 'Calls' : 'Summaries'}
            </GazeAction>
          ))}
        </nav>

        <div className="message-search">
          <div className="search-switch">
            <GazeAction active={searchBy === 'tag'} disabled={searchBy === 'tag'} onClick={() => setSearchBy('tag')}>Tags</GazeAction>
            <GazeAction active={searchBy === 'date'} disabled={searchBy === 'date'} onClick={() => setSearchBy('date')}>Date</GazeAction>
          </div>
          <div className="search-options">
            {searchBy === 'tag'
              ? ['all', 'appointments', 'family', 'health'].map((tag) => (
                  <GazeAction key={tag} active={tagFilter === tag} disabled={tagFilter === tag} onClick={() => {
                    setTagFilter(tag)
                    const first = sampleMessages.find((message) => tag === 'all' || message.tag === tag)
                    if (first) setSelectedMessageId(first.id)
                  }}>{tag}</GazeAction>
                ))
              : ['all', 'today', 'week'].map((date) => (
                  <GazeAction key={date} active={dateFilter === date} disabled={dateFilter === date} onClick={() => {
                    setDateFilter(date)
                    const first = sampleMessages.find((message) => date === 'all' || message.date === date || (date === 'week' && message.date === 'today'))
                    if (first) setSelectedMessageId(first.id)
                  }}>{date === 'week' ? 'This week' : date}</GazeAction>
                ))}
          </div>
        </div>

        <div className="messages-layout">
          <ScrollBox className="message-list" ariaLabel="Conversation list">
              {filteredMessages.map((message) => (
                <GazeAction
                  key={message.id}
                  active={selectedMessageId === message.id && !['compose', 'forward'].includes(messageMode)}
                  disabled={selectedMessageId === message.id && messageMode === (messageFilter === 'summaries' ? 'summary' : 'message')}
                  className="message-row"
                  onClick={() => {
                    setSelectedMessageId(message.id)
                    setMessageMode(messageFilter === 'summaries' ? 'summary' : 'message')
                    if (readPolicy === 'seen') markRead(message.id)
                  }}
              >
                  <strong>{message.person}</strong>
                  <time>{message.time}</time>
                  <span className={`channel channel--${message.channel}`}>{message.channel}</span>
                  <p>{messageFilter === 'summaries' ? message.summary : message.preview}</p>
                </GazeAction>
              ))}
              {filteredMessages.length === 0 && <p className="empty-messages">No messages</p>}
          </ScrollBox>

          <ScrollBox className="message-detail" ariaLabel="Message details">
            <div aria-live="polite">
            {messageMode === 'compose' ? (
              <>
                <p className="detail-label">Send to</p>
                <h2>Choose person</h2>
                <div className="contact-grid">
                  {['Family', 'Doctor office', 'Care team', 'Pharmacy'].map((contact) => (
                    <GazeAction key={contact} onClick={() => beginWriting(contact)}>{contact}</GazeAction>
                  ))}
                </div>
              </>
            ) : messageMode === 'route' ? (
              <>
                <p className="detail-label">Message action</p>
                <h2>Reply or forward?</h2>
                <div className="choice-grid">
                  <GazeAction onClick={() => beginWriting(selectedMessage.person)}>Reply to sender</GazeAction>
                  <GazeAction onClick={() => setMessageMode('forward')}>Forward</GazeAction>
                </div>
              </>
            ) : messageMode === 'forward' ? (
              <>
                <p className="detail-label">Forward message</p>
                <h2>Choose person</h2>
                <div className="contact-grid">
                  {['Family', 'Doctor office', 'Care team', 'Pharmacy'].map((contact) => (
                    <GazeAction key={contact} onClick={() => beginWriting(contact)}>{contact}</GazeAction>
                  ))}
                </div>
              </>
            ) : messageMode === 'write' ? (
              <>
                <p className="detail-label">Message to {composeContact}</p>
                <h2>Choose how to write</h2>
                <div className="writer-grid">
                  <GazeAction onClick={() => prepareMessage('I will be there.')}>I will be there</GazeAction>
                  <GazeAction onClick={() => prepareMessage('Please call me.')}>Please call me</GazeAction>
                  <GazeAction onClick={() => prepareMessage('Thank you.')}>Thank you</GazeAction>
                  <GazeAction onClick={() => { setKeyboardPage(0); setMessageMode('keyboard') }}>Keyboard</GazeAction>
                  <GazeAction onClick={() => setMessageMode('builder')}>Sentence builder</GazeAction>
                </div>
              </>
            ) : messageMode === 'keyboard' ? (
              <>
                <p className="detail-label">Keyboard</p>
                <h2 className="draft-text">{draft || 'Start typing'}</h2>
                <div className="keyboard-grid">
                  {keyboardCharacters.map((character, index) => (
                    <GazeAction key={`${character}-${index}`} onClick={() => setDraft((text) => text + character)}>{character === ' ' ? 'Space' : character}</GazeAction>
                  ))}
                  <GazeAction onClick={() => setKeyboardPage((page) => (page + 1) % 7)}>Next keys</GazeAction>
                  <GazeAction onClick={() => prepareMessage(draft)}>Done</GazeAction>
                </div>
              </>
            ) : messageMode === 'builder' ? (
              <>
                <p className="detail-label">Sentence builder</p>
                <h2 className="draft-text">{draft || 'Build a sentence'}</h2>
                <div className="builder-grid">
                  {builderWords.map((word) => (
                    <GazeAction key={word} onClick={() => setDraft((text) => `${text}${text ? ' ' : ''}${word}`)}>{word}</GazeAction>
                  ))}
                  <GazeAction onClick={() => prepareMessage(draft)}>Done</GazeAction>
                </div>
              </>
            ) : (
              <>
                <p className="detail-label">{selectedMessage.channel} · {selectedMessage.time}</p>
                <h2>{selectedMessage.person}</h2>
                <p className="message-content">{messageMode === 'summary' ? selectedMessage.summary : selectedMessage.preview}</p>
                {messageMode === 'history' && (
                  <div className="history-list">
                    <p><strong>Today</strong><br />{selectedMessage.preview}</p>
                    <p><strong>Previous</strong><br />Conversation history will appear here.</p>
                  </div>
                )}
                <div className="message-actions">
                  <GazeAction onClick={() => setMessageMode('history')}>Text history</GazeAction>
                  <GazeAction onClick={() => setMessageMode('summary')}>Summarize</GazeAction>
                  <GazeAction onClick={() => setMessageMode('route')}>Reply</GazeAction>
                  {readPolicy === 'manual' && unreadMessages.includes(selectedMessage.id) && <GazeAction onClick={() => markRead(selectedMessage.id)}>Mark read</GazeAction>}
                  {selectedMessage.routine && <GazeAction onClick={() => { setNotice('Auto reply prepared'); setMessageMode('message') }}>Auto reply</GazeAction>}
                </div>
              </>
            )}
            </div>
          </ScrollBox>
        </div>
      </main>
    )
  }

  if (view === 'calendar') {
    const selectedEvent = calendarEvents.find((event) => event.id === selectedEventId) ?? calendarEvents[0]
    const weekDays = [
      ['M', '23'],
      ['T', '24'],
      ['W', '25'],
      ['T', '26'],
      ['F', '27'],
      ['S', '28'],
      ['S', '29'],
    ]
    const allDayTimes = ['7:00 AM', '9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM']
    const dayTimes = allDayTimes
    const dayEvents = calendarEvents.filter((event) => Number(event.date.match(/\d+$/)?.[0]) === calendarDay)
    const openDay = (date: number) => {
      setCalendarDay(date)
      const firstEvent = calendarEvents.find((event) => Number(event.date.match(/\d+$/)?.[0]) === date)
      if (firstEvent) setSelectedEventId(firstEvent.id)
      setCalendarView((current) => current === 'day-detail' ? 'day-detail' : 'day')
    }

    return (
      <main className="shell calendar-screen">
        {notice && <div className="inline-notice">✓ {notice}</div>}
        <header className="calendar-header">
          <BackButton onClick={() => setView('home')} />
          <GazeAction className="add-event-button" onClick={() => { setCalendarAddStep(0); setView('calendar-add') }}>Add event</GazeAction>
          <h1>Calendar</h1>
          <div className="calendar-view-stack">
            <div className="calendar-views">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <GazeAction
                  key={mode}
                  active={calendarView === mode || (mode === 'day' && calendarView === 'day-detail')}
                  disabled={calendarView === mode || (mode === 'day' && calendarView === 'day-detail')}
                  onClick={() => setCalendarView(mode)}
                >
                  {mode}
                </GazeAction>
              ))}
            </div>
            {(calendarView === 'day' || calendarView === 'day-detail') && (
              <GazeAction className="day-view-toggle" onClick={() => setCalendarView(calendarView === 'day' ? 'day-detail' : 'day')}>
                {calendarView === 'day' ? 'Show details' : 'Full day'}
              </GazeAction>
            )}
          </div>
        </header>

        {(calendarView === 'day' || calendarView === 'day-detail') && (
          <div className="day-outer-navigation">
            <GazeAction onClick={() => openDay(calendarDay <= 1 ? 31 : calendarDay - 1)}>← Previous day</GazeAction>
            <GazeAction onClick={() => openDay(calendarDay >= 31 ? 1 : calendarDay + 1)}>Next day →</GazeAction>
          </div>
        )}

        <div className={`calendar-layout calendar-layout--${calendarView}`}>
          <section className="calendar-main">
            <div className="calendar-date-bar">
              <strong>{calendarView === 'day' || calendarView === 'day-detail' ? `October ${calendarDay}, 2026` : 'October 2026'}</strong>
              <span>{calendarView === 'month' ? `${calendarEvents.length} total events` : calendarView === 'week' ? 'Select a day' : 'Messages synced'}</span>
            </div>

            {(calendarView === 'day' || calendarView === 'day-detail') && (
              <div className="day-view-shell">
                <div className="day-view">
                  {dayTimes.map((time) => (
                    <div className="time-row" key={time}>
                      <time>{time}</time>
                      {dayEvents.filter((event) => event.time === time).map((event) => (
                        <GazeAction key={event.id} className="calendar-event" onClick={() => { setSelectedEventId(event.id); setCalendarView('day-detail') }}>
                          {event.title}
                        </GazeAction>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calendarView === 'week' && (
              <div className="week-view">
                {weekDays.map(([letter, date]) => {
                  const events = calendarEvents.filter((event) => event.date.endsWith(date))
                  return (
                    <GazeAction className="week-day" key={date} onClick={() => openDay(Number(date))}>
                      <strong><span>{letter}</span><small>{date}</small></strong>
                      <div className="week-events">
                        {events.slice(0, 2).map((event) => <span key={event.id}>{event.time} {event.title}</span>)}
                        {events.length > 2 && <b>+{events.length - 2} events</b>}
                      </div>
                    </GazeAction>
                  )
                })}
              </div>
            )}

            {calendarView === 'month' && (
              <div className="month-view">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, index) => (
                  <div className="month-weekday" key={`${letter}-${index}`}>{letter}</div>
                ))}
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                  const count = calendarEvents.filter((event) => Number(event.date.match(/\d+$/)?.[0]) === day).length
                  return (
                    <button className="month-day" key={day} onClick={() => openDay(day)}>
                      <strong>{day}</strong>
                      {count > 0 && <span>{count} {count === 1 ? 'event' : 'events'}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {calendarView === 'day-detail' && (
            <ScrollBox className="event-detail" ariaLabel="Calendar event details">
              {selectedEvent && Number(selectedEvent.date.match(/\d+$/)?.[0]) === calendarDay ? (
                <div>
                  <p className="detail-label">{selectedEvent.day} · {selectedEvent.date}</p>
                  <h2>{selectedEvent.title}</h2>
                  <p className="event-time">{selectedEvent.time}</p>
                  <p>{selectedEvent.detail}</p>
                  <div className="event-source">
                    <strong>From messages</strong>
                    <span>{selectedEvent.source}</span>
                  </div>
                  <div className="event-actions">
                    <GazeAction onClick={() => setView('messages')}>Open message</GazeAction>
                    <GazeAction onClick={() => setNotice('Reminder added')}>Add reminder</GazeAction>
                  </div>
                </div>
              ) : <p>No events on this day</p>}
            </ScrollBox>
          )}
        </div>
      </main>
    )
  }

  let items: string[] = []
  let next: (label: string) => void = () => {}
  const beginFeature = (name: Feature, origin: View) => {
    setFeature(name)
    setFeatureStep(0)
    setFeatureChoice('')
    setFeatureOrigin(origin)
    setView('feature')
  }

  if (view === 'home') {
    items = ['routines', 'messages', 'errand', 'calendar', 'internet', 'health', 'settings', 'accessibility', ...customWorkflows, 'create workflow', 'help', 'log out']
    next = (label) => {
      if (label === 'routines') setView('routines')
      else if (label === 'messages') setView('messages')
      else if (label === 'calendar') setView('calendar')
      else if (label === 'health') beginFeature('health', 'home')
      else if (label === 'settings') setView('button-settings')
      else if (label === 'create workflow') { setWorkflowPrompt(''); setWorkflowKeyboard(false); setView('workflow-create') }
      else if (label === 'help' || label === 'accessibility') setNotice(`${label} opened`)
      else if (label === 'log out') setView('login')
      else if (customWorkflows.includes(label)) setNotice(`${label} started`)
      else beginFeature(label as Feature, 'home')
    }
  } else if (view === 'routines') {
    items = ['morning', 'catch up', 'appointments', 'calendar', '', '']
    next = (label) => label === 'appointments' ? setView('appointments') : label === 'calendar' ? setView('calendar') : beginFeature(label as Feature, 'routines')
  } else if (view === 'more') {
    items = ['health', 'settings', 'accessibility', 'create workflow', 'help', 'log out']
    next = (label) => {
      if (label === 'health') beginFeature('health', 'more')
      else if (label === 'settings') setView('button-settings')
      else if (label === 'create workflow') { setWorkflowPrompt(''); setWorkflowKeyboard(false); setView('workflow-create') }
      else if (label === 'log out') setView('login')
      else {
        setNotice(`${label} opened`)
      }
    }
  } else if (view === 'button-settings') {
    items = [
      buttonCount === 4 ? '4 buttons selected' : '4 buttons',
      buttonCount === 6 ? '6 buttons selected' : '6 buttons',
      buttonCount === 9 ? '9 buttons selected' : '9 buttons',
      buttonCount === 16 ? '16 buttons selected' : '16 buttons',
      readPolicy === 'seen' ? 'seen is read selected' : 'seen is read',
      readPolicy === 'manual' ? 'mark read selected' : 'mark read',
      theme === 'blue' ? 'blue theme selected' : 'blue theme',
      theme === 'dark' ? 'dark theme selected' : 'dark theme',
      theme === 'warm' ? 'warm theme selected' : 'warm theme',
      theme === 'contrast' ? 'high contrast selected' : 'high contrast',
      boxSpacing === 'compact' ? 'compact spacing selected' : 'compact spacing',
      boxSpacing === 'normal' ? 'normal spacing selected' : 'normal spacing',
      boxSpacing === 'wide' ? 'wide spacing selected' : 'wide spacing',
      buttonFontSize === 'small' ? 'small text selected' : 'small text',
      buttonFontSize === 'normal' ? 'normal text selected' : 'normal text',
      buttonFontSize === 'large' ? 'large text selected' : 'large text',
      homeStyle === 'classic' ? 'classic home selected' : 'classic home',
      homeStyle === 'illustrated' ? 'illustrated home selected' : 'illustrated home',
      homeStyle === 'sidebar' ? 'side controls selected' : 'side controls',
    ]
    next = (label) => {
      if (label.startsWith('4')) setButtonCount(4)
      if (label.startsWith('6')) setButtonCount(6)
      if (label.startsWith('9')) setButtonCount(9)
      if (label.startsWith('16')) setButtonCount(16)
      if (label.startsWith('seen')) setReadPolicy('seen')
      if (label.startsWith('mark')) setReadPolicy('manual')
      if (label.startsWith('blue')) setTheme('blue')
      if (label.startsWith('dark')) setTheme('dark')
      if (label.startsWith('warm')) setTheme('warm')
      if (label.startsWith('high')) setTheme('contrast')
      if (label.startsWith('compact spacing')) setBoxSpacing('compact')
      if (label.startsWith('normal spacing')) setBoxSpacing('normal')
      if (label.startsWith('wide spacing')) setBoxSpacing('wide')
      if (label.startsWith('small text')) setButtonFontSize('small')
      if (label.startsWith('normal text')) setButtonFontSize('normal')
      if (label.startsWith('large text')) setButtonFontSize('large')
      if (label.startsWith('classic home')) setHomeStyle('classic')
      if (label.startsWith('illustrated home')) setHomeStyle('illustrated')
      if (label.startsWith('side controls')) setHomeStyle('sidebar')
    }
  } else if (view === 'calendar-add') {
    items = calendarAddStep === 0
      ? ['appointment', 'family visit', 'errand', 'meeting', 'therapy', 'social event']
      : calendarAddStep === 1
        ? ['October 25', 'October 26', 'October 28', 'October 30', 'November 1', 'November 4']
        : ['family', 'care team', 'doctor', 'friend', 'everyone', 'just me']
    next = (label) => {
      if (calendarAddStep === 0) {
        setCalendarAddType(label)
        setCalendarAddStep(1)
      } else if (calendarAddStep === 1) {
        setCalendarAddDate(label)
        setCalendarAddStep(2)
      } else {
        const id = Date.now()
        setCalendarEvents((events) => [...events, {
          id,
          title: calendarAddType,
          date: calendarAddDate,
          day: calendarAddDate,
          time: '9:00 AM',
          detail: `${calendarAddType} with ${label}. Everyone involved will be messaged and transportation will be arranged.`,
          source: 'Calendar',
        }])
        setSelectedEventId(id)
        setNotice(label === 'just me' ? 'Event added • Transportation booked' : 'Event added • Everyone messaged • Transportation booked')
        setView('calendar')
      }
    }
  } else if (view === 'feature') {
    const options = featureStep === 0 ? featureFlows[feature] : secondSteps[feature][featureChoice]
    items = [...options, '', '', '', '', '', ''].slice(0, 6)
    next = (label) => {
      if (feature === 'health' && featureStep === 0 && label === 'appointments') {
        setView('appointments')
      } else if (featureStep === 0) {
        setFeatureChoice(label)
        setFeatureStep(1)
      } else {
        const completionMessages: Record<Feature, string> = {
          morning: 'Morning routine started',
          'catch up': 'You are caught up',
          messages: featureChoice === 'read new' ? 'Message opened' : 'Message task completed',
          errand: 'Errand scheduled',
          calendar: featureChoice === 'new event' ? 'Added to calendar' : 'Calendar opened',
          internet: 'Result opened',
          health: 'Health task completed',
        }
        setNotice(completionMessages[feature])
        setView(featureOrigin)
      }
    }
  } else if (view === 'appointments') {
    items = ['new appointments', 'manage appointments', '', '', '', '']
    next = (label) => {
      if (label === 'new appointments') setView('appointment-type')
      else {
        setNotice('Appointments opened')
      }
    }
  } else if (view === 'appointment-type') {
    items = ['follow up primary', 'specialist appointment', 'discover appointment', '', '', '']
    next = () => setView('urgency')
  } else if (view === 'urgency') {
    items = ['as soon as possible', 'find best time', '', '', '', '']
    next = () => setView('time')
  } else if (view === 'time') {
    items = ['10/25 3:00', '10/28 1:00', '', '', '', '']
    next = () => setView('transport')
  } else if (view === 'transport') {
    items = ['book uber transportation', 'book family transportation', '', '', '', '']
    next = () => setView('confirm')
  } else {
    items = ['confirm', 'cancel', '', '', '', '']
    next = (label) => {
      if (label === 'confirm') {
        setCalendarEvents((events) => events.some((event) => event.id === 3) ? events : [...events, {
          id: 3,
          title: 'Doctor appointment',
          date: 'October 28',
          day: 'Saturday',
          time: '1:00 PM',
          detail: 'Appointment scheduled through Twinly.',
          source: 'Appointment workflow',
        }])
        setSelectedEventId(3)
        setNotice('Added to calendar')
        setView('calendar')
      } else setView('appointments')
    }
  }

  const goBack = () => {
    if (view === 'calendar-add' && calendarAddStep > 0) {
      setCalendarAddStep((step) => step - 1)
      return
    }
    if (view === 'feature') {
      if (featureStep > 0) setFeatureStep(0)
      else setView(featureOrigin)
      return
    }
    if (history[view]) setView(history[view]!)
  }

  const availableItems = items.filter(Boolean)
  const sidebarHome = view === 'home' && homeStyle === 'sidebar'
  const singlePageCapacity = sidebarHome ? 6 : buttonCount - 1
  const needsPages = availableItems.length > singlePageCapacity
  const pageSize = sidebarHome ? 6 : needsPages ? buttonCount - 2 : singlePageCapacity
  const pageCount = Math.max(1, Math.ceil(availableItems.length / pageSize))
  const safeGridPage = Math.min(gridPage, pageCount - 1)
  const gridItems = availableItems.slice(safeGridPage * pageSize, (safeGridPage + 1) * pageSize)
  if (!sidebarHome && needsPages && safeGridPage < pageCount - 1) {
    gridItems.push('→')
  }
  while (gridItems.length < (sidebarHome ? 6 : buttonCount - 1)) gridItems.push('')
  if (!sidebarHome) gridItems.push('← back')
  const gridBack = () => {
    if (safeGridPage > 0) setGridPage((page) => page - 1)
    else if (view === 'home') return
    else goBack()
  }
  const runGridAction = (label: string) => {
    if (label === 'create workflow' || label === 'create another workflow') {
      setWorkflowPrompt('')
      setWorkflowKeyboard(false)
      setView('workflow-create')
    } else if (label === 'calendar' || label === 'open calendar') setView('calendar')
    else if (label === 'messages' || label === 'open messages') setView('messages')
    else if (label === 'settings' || label === 'open settings') setView('button-settings')
    else if (label === 'more') setView('more')
    else if (label === 'home' || label === 'go home') setView('home')
    else if (label === 'help' || label === 'quick help') setNotice('Look at any button to select it')
    else next(label)
  }
  const illustratedHome = view === 'home' && homeStyle === 'illustrated'

  if (sidebarHome) {
    return (
      <main className="shell sidebar-home">
        {notice && <div className="inline-notice">✓ {notice}</div>}
        <header className="sidebar-home-header">
          <div><h1>Home</h1><span>Page {safeGridPage + 1} of {pageCount}</span></div>
          <div><i className={gazePaused ? 'paused' : ''} /><span>{gazePaused ? 'Eyes paused' : 'Eyes found'}</span></div>
        </header>
        <div className="sidebar-home-layout">
          <section className="sidebar-home-content">
            <div className="sidebar-home-grid">
              {gridItems.map((label, index) => (
                <Tile
                  key={`${label}-${index}`}
                  label={label}
                  muted={!label}
                  icon={label && label !== 'health' ? <HomeIcon type={label} /> : undefined}
                  dwellEnabled={!gazePaused}
                  badge={label === 'messages' && unreadMessages.length > 0 ? String(unreadMessages.length) : undefined}
                  onClick={() => runGridAction(label)}
                />
              ))}
            </div>
            <footer className="sidebar-home-pager">
              <GazeAction disabled={safeGridPage === 0} onClick={() => setGridPage((page) => Math.max(0, page - 1))}>← Previous</GazeAction>
              <span>{Array.from({ length: pageCount }, (_, index) => <i className={index === safeGridPage ? 'active' : ''} key={index} />)}</span>
              <GazeAction disabled={safeGridPage === pageCount - 1} onClick={() => setGridPage((page) => Math.min(pageCount - 1, page + 1))}>Next page →</GazeAction>
            </footer>
          </section>
          <aside className="sidebar-home-rail">
            <GazeAction className="pause-eyes" onClick={() => setGazePaused((paused) => !paused)}>{gazePaused ? 'Resume eyes' : 'Pause eyes'}</GazeAction>
            <GazeAction disabled={safeGridPage === 0} onClick={() => setGridPage((page) => Math.max(0, page - 1))}>← Back</GazeAction>
            <GazeAction disabled onClick={() => {}}>Home</GazeAction>
            <GazeAction className="get-help" onClick={() => setNotice('Help request ready')}>Get help</GazeAction>
          </aside>
        </div>
      </main>
    )
  }

  return (
    <main className={`shell grid-screen ${illustratedHome ? 'grid-screen--illustrated' : ''}`}>
      {notice && <div className="inline-notice">✓ {notice}</div>}
      {illustratedHome && (
        <header className="illustrated-home-header">
          <h1>Home</h1>
          <div>
            <span>Page {safeGridPage + 1} of {pageCount}</span>
            <GazeAction onClick={() => setNotice('Look at a card to select it')} ariaLabel="Help">?</GazeAction>
          </div>
        </header>
      )}
      <div className={`tile-grid tile-grid--${buttonCount}`}>
        {gridItems.map((label, index) => (
          <Tile
            key={`${label}-${index}`}
            label={label}
            muted={!label}
            back={index === buttonCount - 1}
            disabled={(view === 'home' && safeGridPage === 0 && index === buttonCount - 1) || label.includes('selected')}
            illustrated={illustratedHome}
            icon={illustratedHome && label ? <HomeIcon type={label} /> : undefined}
            badge={view === 'home' && label === 'messages' && unreadMessages.length > 0 ? String(unreadMessages.length) : undefined}
            onClick={
              index === buttonCount - 1
                ? gridBack
                : label === '→'
                  ? () => setGridPage((page) => page + 1)
                  : () => runGridAction(label)
            }
          />
        ))}
      </div>
    </main>
  )
}
