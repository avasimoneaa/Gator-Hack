import { escapeHTML, gazeButton, backButton, scrollBox } from './ui.js'

// Dates are local "YYYY-MM-DD" strings. Events come from the connected
// calendar through Twinly (read-only); nothing here writes to a calendar.

export function toISODate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function parseISODate(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(iso, days) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function formatLongDate(iso) {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Twinly returns free-text start times. Events whose start can't be read as a
// date still appear in the Upcoming list, just not on the day/week/month views.
export function parseCalendarEvents(events) {
  return events.slice(0, 10).map(function (event, index) {
    const title = String(event.title || 'Event').slice(0, 200)
    const start = String(event.start || '').slice(0, 120)
    const location = String(event.location || '').slice(0, 200)
    const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start)
    const parsed = allDay ? parseISODate(start) : new Date(start)
    const valid = Boolean(start) && !Number.isNaN(parsed.getTime())
    return {
      id: 'event-' + index, title, start, location,
      date: valid ? toISODate(parsed) : '',
      time: !valid ? '' : allDay ? 'All day' : parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sortKey: valid ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
    }
  }).sort((a, b) => a.sortKey - b.sortKey)
}

function startOfWeek(iso) {
  const date = parseISODate(iso)
  return addDays(iso, -((date.getDay() + 6) % 7))
}

function eventsOn(events, iso) {
  return events.filter(event => event.date === iso)
}

function eventCards(events) {
  return '<div class="event-list">' + events.map(event => '<article class="event-card"><strong>' + escapeHTML(event.title) + '</strong>' +
    '<span>' + escapeHTML(event.date ? formatLongDate(event.date) + (event.time ? ' · ' + event.time : '') : event.start || 'Time not given') + '</span>' +
    (event.location ? '<small>' + escapeHTML(event.location) + '</small>' : '') + '</article>').join('') + '</div>'
}

export function calendarScreen(state) {
  const calendar = state.calendar
  const events = state.calendarEvents
  const date = parseISODate(calendar.date)
  const today = todayISO()

  const views = ['upcoming', 'day', 'week', 'month'].map(function (mode) {
    const active = calendar.view === mode
    return gazeButton(mode, 'calendar-view', { data: { view: mode }, active, disabled: active || !calendar.loaded })
  }).join('')
  const header = '<header class="calendar-header">' + backButton() +
    gazeButton(calendar.loaded ? 'Refresh' : 'Load calendar', 'calendar-load', { className: 'calendar-load-button' }) +
    '<h1>Calendar</h1><div class="calendar-view-stack"><div class="calendar-views">' + views + '</div></div></header>'

  if (!calendar.loaded) {
    return '<main class="shell calendar-screen">' + header + '<section class="calendar-main calendar-main--empty"><div class="calendar-empty">' +
      '<h2>Your calendar isn’t loaded yet</h2><p>Twinly reads up to 10 upcoming events from the connected calendar after you confirm. It never creates, changes, or deletes events.</p>' +
      gazeButton('Load my calendar', 'calendar-load', { className: 'primary-action' }) + '</div></section></main>'
  }

  const dayNavigation = calendar.view === 'day'
    ? '<div class="day-outer-navigation">' + gazeButton('← Previous day', 'calendar-shift-day', { data: { days: '-1' } }) +
      gazeButton('Next day →', 'calendar-shift-day', { data: { days: '1' } }) + '</div>'
    : ''

  let title = 'Next ' + events.length + (events.length === 1 ? ' event' : ' events')
  let summary = 'From your connected calendar'
  let body = ''
  if (calendar.view === 'upcoming') {
    body = scrollBox(events.length ? eventCards(events) : '<p class="calendar-note">No upcoming events were returned.</p>', { className: 'calendar-scroll', ariaLabel: 'Upcoming events' })
  } else if (calendar.view === 'day') {
    const dayEvents = eventsOn(events, calendar.date)
    title = formatLongDate(calendar.date)
    summary = dayEvents.length ? dayEvents.length + (dayEvents.length === 1 ? ' event' : ' events') : 'No events'
    body = scrollBox(dayEvents.length ? eventCards(dayEvents) : '<p class="calendar-note">No loaded events on this day.</p>', { className: 'calendar-scroll', ariaLabel: 'Events this day' })
  } else if (calendar.view === 'week') {
    const monday = startOfWeek(calendar.date)
    title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    summary = 'Select a day'
    body = '<div class="week-view">' + Array.from({ length: 7 }, function (_, index) {
      const iso = addDays(monday, index)
      const day = parseISODate(iso)
      const dayEvents = eventsOn(events, iso)
      const label = '<strong><span>' + day.toLocaleDateString('en-US', { weekday: 'narrow' }) + '</span><small>' + day.getDate() + '</small></strong>' +
        '<span class="week-events">' + dayEvents.slice(0, 2).map(event => '<span>' + escapeHTML((event.time ? event.time + ' ' : '') + event.title) + '</span>').join('') +
        (dayEvents.length > 2 ? '<b>+' + (dayEvents.length - 2) + ' events</b>' : '') + '</span>'
      return gazeButton(label, 'calendar-open-day', { data: { date: iso }, className: 'week-day' + (iso === today ? ' is-today' : ''), html: true, ariaLabel: formatLongDate(iso) + ', ' + dayEvents.length + ' events' })
    }).join('') + '</div>'
  } else {
    const first = new Date(date.getFullYear(), date.getMonth(), 1)
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const offset = (first.getDay() + 6) % 7
    title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    summary = 'Select a day'
    body = '<div class="month-view">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(letter => '<div class="month-weekday">' + letter + '</div>').join('') +
      Array.from({ length: offset }, () => '<div class="month-blank"></div>').join('') +
      Array.from({ length: daysInMonth }, function (_, index) {
        const iso = toISODate(new Date(date.getFullYear(), date.getMonth(), index + 1))
        const count = eventsOn(events, iso).length
        return gazeButton('<strong>' + (index + 1) + '</strong>' + (count ? '<span>' + count + (count === 1 ? ' event' : ' events') + '</span>' : ''), 'calendar-open-day',
          { data: { date: iso }, className: 'month-day' + (iso === today ? ' is-today' : ''), html: true, ariaLabel: formatLongDate(iso) + ', ' + count + ' events' })
      }).join('') + '</div>'
  }

  return '<main class="shell calendar-screen">' + header + dayNavigation +
    '<div class="calendar-layout"><section class="calendar-main"><div class="calendar-date-bar"><strong>' + escapeHTML(title) + '</strong><span>' + escapeHTML(summary) + '</span></div>' + body + '</section></div></main>'
}
