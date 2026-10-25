import { escapeHTML, gazeButton, backButton, scrollBox } from './ui.js'
import { QUICK_REPLIES, builderWords } from './demo-data.js'

// Messages: real text threads with saved contacts, real emails (through
// Twinly), and calls and tasks started in iSpeak. Every send is reviewed first.
const FILTERS = [['texts', 'Texts'], ['emails', 'Emails'], ['calls', 'Calls & activity']]
const ACTIVITY_KINDS = ['call', 'message', 'task']

export function inboxActivity(state) {
  return state.inbox.activity.filter(item => ACTIVITY_KINDS.includes(item.kind))
}

function activityLabel(item) {
  return item.kind === 'call' ? 'Call' : item.kind === 'message' ? 'Text' : 'Task'
}

function contactChooser(inbox) {
  const contacts = inbox.contacts.map(contact => gazeButton(contact.name, 'inbox-choose-contact', { data: { id: contact.id } })).join('')
  const empty = inbox.contactsLoaded
    ? (inbox.contactsError ? '<p class="warning-text">' + escapeHTML(inbox.contactsError) + '</p>' : '<p>No saved contacts yet. A caregiver can add them in Settings → Caregiver settings.</p>')
    : '<p>Loading your contacts…</p>'
  return '<p class="detail-label">Send to</p><h2>Choose person</h2>' + (contacts ? '' : empty) +
    '<div class="contact-grid">' + contacts + gazeButton('Just say it aloud', 'inbox-choose-contact', { data: { id: '' } }) + '</div>'
}

function writingContent(inbox) {
  const recipient = inbox.contact?.name || 'someone nearby'
  if (inbox.mode === 'compose') return contactChooser(inbox)
  if (inbox.mode === 'write') {
    return '<p class="detail-label">Message to ' + escapeHTML(recipient) + '</p><h2>Choose how to write</h2><div class="writer-grid">' +
      QUICK_REPLIES.map(text => gazeButton(text.replace(/\.$/, ''), 'inbox-quick', { data: { text } })).join('') +
      gazeButton('Say what I mean', 'inbox-say-what-i-mean') + gazeButton('Keyboard', 'inbox-keyboard') + gazeButton('Sentence builder', 'inbox-builder') + '</div>'
  }
  if (inbox.mode === 'builder') {
    return '<p class="detail-label">Sentence builder</p><h2 class="draft-text">' + escapeHTML(inbox.draft || 'Build a sentence') + '</h2><div class="builder-grid">' +
      builderWords(inbox.draft).map(word => gazeButton(word, 'inbox-word', { data: { word } })).join('') +
      gazeButton('Done', 'inbox-done', { disabled: !inbox.draft }) + '</div>'
  }
  const canSend = Boolean(inbox.contact?.id)
  return '<p class="detail-label">' + (canSend ? 'Ready for ' + escapeHTML(recipient) : 'Ready to say aloud') + '</p><h2 class="draft-text">' + escapeHTML(inbox.draft) + '</h2>' +
    '<div class="message-actions">' + (canSend ? gazeButton('Review and send', 'inbox-review-send', { className: 'primary-action' }) : '') +
    gazeButton('Speak aloud', 'inbox-speak-draft') + gazeButton('Speak in my Twinly voice', 'inbox-twinly-voice') +
    gazeButton('Write it again', 'inbox-rewrite') + '</div>' +
    (canSend ? '<p class="detail-note">Nothing is sent until you review it and hold your gaze on Confirm.</p>' : '')
}

function threadContent(inbox) {
  const contact = inbox.contact
  const messages = inbox.thread.map(message => '<article class="thread-message"><small>' + escapeHTML(message.from || message.direction || 'Message') +
    (message.sent_at ? ' · ' + escapeHTML(message.sent_at) : '') + '</small><p>' + escapeHTML(message.text) + '</p></article>').join('')
  const status = inbox.threadLoading ? '<p>Loading recent texts…</p>'
    : inbox.threadError ? '<p class="warning-text">' + escapeHTML(inbox.threadError) + '</p>'
      : messages ? '' : '<p>No recent texts were returned.</p>'
  return '<p class="detail-label">Texts with ' + escapeHTML(contact.name) + '</p><h2>' + escapeHTML(contact.name) + '</h2>' + status +
    (messages ? '<div class="message-thread">' + messages + '</div>' : '') +
    '<div class="message-actions">' + (inbox.thread.length ? gazeButton('Reply with Gemma', 'inbox-thread-gemma', { className: 'primary-action' }) : '') +
    gazeButton('Write a reply', 'inbox-thread-write') + gazeButton('Call ' + contact.name, 'inbox-thread-call') + gazeButton('Refresh', 'inbox-thread-refresh') + '</div>'
}

function emailContent(state, email) {
  const summary = state.inbox.mode === 'summary' || email.summary
  return '<p class="detail-label">email · ' + escapeHTML(email.received_at || '') + '</p><h2>' + escapeHTML(email.sender || 'Unknown sender') + '</h2>' +
    '<p class="message-content">' + escapeHTML(email.subject || 'No subject') + '</p>' +
    (summary && email.summary ? '<div class="result-card">' + escapeHTML(email.summary) + '</div>' : '') +
    '<div class="message-actions">' + gazeButton(email.summary ? 'Summarize again' : 'Summarize with Twinly', 'inbox-summarize-email') +
    (email.summary ? gazeButton('Read summary aloud', 'inbox-read-summary') : '') +
    gazeButton('Reply with Gemma', 'inbox-email-reply') + '</div>'
}

function activityContent(inbox, item) {
  return '<p class="detail-label">' + escapeHTML(activityLabel(item) + (item.created_at ? ' · ' + item.created_at : '')) + '</p><h2>' + escapeHTML(activityLabel(item)) + '</h2>' +
    '<p class="message-content">' + escapeHTML(item.summary || '') + '</p>' + (item.asked_by ? '<p>Started by ' + escapeHTML(item.asked_by) + '</p>' : '') +
    (inbox.activityDetail ? '<div class="result-card">' + escapeHTML(inbox.activityDetail) + '</div>' : '') +
    (item.job_id ? '<div class="message-actions">' + gazeButton('Read status', 'inbox-activity-status', { data: { job: item.job_id } }) + '</div>' : '')
}

function detailContent(state) {
  const inbox = state.inbox
  if (['compose', 'write', 'builder', 'ready'].includes(inbox.mode)) return writingContent(inbox)
  const [kind, key] = String(inbox.selectedId).split(':')
  if (kind === 'contact' && inbox.contact) return threadContent(inbox)
  if (kind === 'email' && state.emailList[Number(key)]) return emailContent(state, state.emailList[Number(key)])
  const activity = inboxActivity(state)
  if (kind === 'activity' && activity[Number(key)]) return activityContent(inbox, activity[Number(key)])
  if (inbox.filter === 'emails') return '<p class="detail-label">Emails</p><h2>Your email</h2><p class="message-content">Load your newest emails through Twinly, then choose one to summarize or reply to.</p>'
  if (inbox.filter === 'calls') return '<p class="detail-label">Calls & activity</p><h2>Recent iSpeak actions</h2><p class="message-content">Calls, texts, and tasks started in iSpeak. Twinly doesn’t share its incoming-call history here yet.</p>'
  return '<p class="detail-label">Texts</p><h2>Your conversations</h2><p class="message-content">Choose a contact to read your recent texts and reply.</p>'
}

function row(label, detail, action, options) {
  return gazeButton('<strong>' + escapeHTML(label) + '</strong>' + (options.time ? '<time>' + escapeHTML(options.time) + '</time>' : '') +
    (options.channel ? '<span class="channel">' + escapeHTML(options.channel) + '</span>' : '') + '<span class="row-text">' + escapeHTML(detail) + '</span>',
  action, { data: options.data, className: 'message-row' + (options.tool ? ' message-row--tool' : ''), html: true, active: options.selected, disabled: options.disabled })
}

export function inboxScreen(state) {
  const inbox = state.inbox
  const writing = ['compose', 'write', 'builder', 'ready'].includes(inbox.mode)
  const header = '<header class="messages-header">' + backButton() + '<h1>Messages</h1>' +
    gazeButton('Call', 'inbox-call') + gazeButton('New message', 'inbox-new', { className: 'new-message' }) + '</header>'
  const filters = '<nav class="message-filters" aria-label="Message types">' + FILTERS.map(([value, label]) =>
    gazeButton(label, 'inbox-filter', { data: { filter: value }, active: inbox.filter === value, disabled: inbox.filter === value })).join('') + '</nav>'

  let rows = ''
  if (inbox.filter === 'texts') {
    rows = inbox.contacts.map(contact => row(contact.name, 'Read recent texts', 'inbox-open-thread',
      { data: { id: contact.id }, channel: 'text', selected: !writing && inbox.selectedId === 'contact:' + contact.id })).join('') ||
      (inbox.contactsLoaded ? '<p class="empty-messages">' + escapeHTML(inbox.contactsError || 'No saved contacts yet. A caregiver can add them in Settings → Caregiver settings.') + '</p>' : '<p class="empty-messages">Loading contacts…</p>')
  } else if (inbox.filter === 'emails') {
    rows = row(state.emailList.length ? 'Reload my emails' : 'Load my emails', 'Twinly lists your 10 newest emails after you confirm.', 'inbox-load-emails', { tool: true }) +
      row('Ask by voice', state.voiceMessage || 'Say “Read my newest email.” Gemma prepares the request for review.', 'inbox-ask-voice', { tool: true, disabled: state.voiceBusy }) +
      state.emailList.map((email, index) => row(email.sender || 'Unknown sender', email.subject || 'No subject', 'inbox-select-email',
        { data: { index }, time: email.received_at, channel: 'email', selected: !writing && inbox.selectedId === 'email:' + index })).join('')
  } else {
    const activity = inboxActivity(state)
    rows = activity.map((item, index) => row(activityLabel(item), item.summary || '', 'inbox-select-activity',
      { data: { index }, time: item.created_at, channel: item.kind, selected: !writing && inbox.selectedId === 'activity:' + index })).join('') ||
      '<p class="empty-messages">' + (inbox.activityLoaded ? 'No recent iSpeak activity.' : 'Loading activity…') + '</p>'
  }

  return '<main class="shell messages-screen">' + header + filters +
    '<div class="messages-layout">' +
    scrollBox(rows, { className: 'message-list', ariaLabel: 'Conversation list' }) +
    scrollBox('<div aria-live="polite">' + detailContent(state) + '</div>', { className: 'message-detail', ariaLabel: 'Message details' }) +
    '</div></main>'
}
