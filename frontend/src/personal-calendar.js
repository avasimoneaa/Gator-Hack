import { escapeHTML, gazeButton, backButton } from './ui.js'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
}

export function personalCalendarScreen(state) {
  const events = (state.appCalendarEvents || []).slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const form = state.calendarAdding ? '<form id="app-calendar-form" class="app-calendar-form">' +
    '<label class="field">Event name<input name="title" maxlength="120" required></label>' +
    '<label class="field">Date and time<input name="starts_at" type="datetime-local" required></label>' +
    '<label class="field">Location (optional)<input name="location" maxlength="200"></label>' +
    '<label class="field">Notes (optional)<textarea name="notes" maxlength="1000" rows="3"></textarea></label>' +
    (state.calendarError ? '<p class="warning-text" role="status">' + escapeHTML(state.calendarError) + '</p>' : '') +
    '<div class="action-grid">' + gazeButton('Save event', null, { type: 'submit', className: 'primary-action' }) + gazeButton('Cancel', 'calendar-cancel-add') + '</div></form>' : ''
  const list = events.length ? '<div class="app-calendar-events">' + events.map(event => '<article class="app-calendar-event"><div><h2>' + escapeHTML(event.title) + '</h2><p><strong>' + escapeHTML(formatDate(event.starts_at)) + '</strong></p>' +
    (event.location ? '<p>' + escapeHTML(event.location) + '</p>' : '') + (event.notes ? '<p>' + escapeHTML(event.notes) + '</p>' : '') +
    '</div><div class="app-calendar-event-actions">' + gazeButton('Message a caregiver', 'calendar-share-event', { data: { id: event.id } }) + gazeButton('Delete', 'calendar-delete-event', { data: { id: event.id }, className: 'secondary' }) + '</div></article>').join('') + '</div>' : '<p class="empty-state">No events yet. Add an appointment or reminder to get started.</p>'
  return '<main class="shell app-calendar-screen">' + backButton('go-back') + '<header class="app-calendar-header"><div><p class="detail-label">Your events</p><h1>My calendar</h1><p>These events are saved in this app and kept separate from the connected Twinly calendar.</p></div><div class="app-calendar-actions">' + gazeButton('Add event', 'calendar-add') + gazeButton('Twinly calendar', 'open-twinly-calendar') + '</div></header>' + form + (state.appCalendarLoading ? '<p role="status">Loading events…</p>' : '') + (state.calendarError ? '<p class="warning-text" role="status">' + escapeHTML(state.calendarError) + '</p>' : '') + list + '</main>'
}
