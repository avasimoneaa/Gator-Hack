// HTML-string helpers that mirror the Figma design's React components
// (Tile, GazeAction, BackButton, ScrollBox). Every screen is rebuilt with
// innerHTML, so these return markup and main.js handles the data-actions.

export const ui = { scrollMode: false }

const DWELL_TRACK = '<i class="dwell-track" aria-hidden="true"><i></i></i>'

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  })
}

function actionAttributes(action, data) {
  let attributes = action ? ' data-action="' + escapeHTML(action) + '"' : ''
  Object.entries(data || {}).forEach(function ([key, value]) {
    attributes += ' data-' + key + '="' + escapeHTML(value) + '"'
  })
  return attributes
}

// A gaze-selectable action button. Labels are escaped unless `html` is set.
export function gazeButton(label, action, options = {}) {
  const classes = ['gaze-action', options.active ? 'gaze-action--active' : '', options.className || ''].filter(Boolean).join(' ')
  return '<button type="' + (options.type || 'button') + '"' + (options.id ? ' id="' + escapeHTML(options.id) + '"' : '') + ' class="' + classes + '"' + actionAttributes(action, options.data) +
    (options.whilePaused ? ' data-while-paused' : '') +
    (options.ariaLabel ? ' aria-label="' + escapeHTML(options.ariaLabel) + '"' : '') +
    (options.active ? ' aria-pressed="true"' : '') +
    (options.disabled ? ' disabled' : '') + '>' +
    (options.html ? label : escapeHTML(label)) + DWELL_TRACK + '</button>'
}

// A large grid tile. An empty label renders the design's muted placeholder.
export function tile(label, action, options = {}) {
  if (!label) return '<button type="button" class="tile tile--muted" disabled aria-label="Unavailable"></button>'
  const classes = ['tile', options.back ? 'tile--back' : '', options.health ? 'tile--health' : '', options.className || ''].filter(Boolean).join(' ')
  return '<button type="button" class="' + classes + '"' + actionAttributes(action, options.data) +
    (options.whilePaused ? ' data-while-paused' : '') +
    (options.disabled ? ' disabled' : '') + '>' +
    (options.badge ? '<span class="badge" aria-label="' + escapeHTML(options.badge) + ' unread">' + escapeHTML(options.badge) + '</span>' : '') +
    (options.health ? '<img class="health-illustration" src="/assets/health-illustration.png" alt="">' : '') +
    (options.icon ? '<span class="home-icon" aria-hidden="true">' + options.icon + '</span>' : '') +
    '<span class="tile-label">' + escapeHTML(label) + '</span>' +
    (options.subtitle ? '<small class="tile-sub">' + escapeHTML(options.subtitle) + '</small>' : '') +
    DWELL_TRACK + '</button>'
}

export function backButton(action = 'go-back', label = 'Back') {
  return gazeButton('← ' + label, action, { className: 'back' })
}

// In page-button mode long content gets gaze-selectable ↑ ↓ buttons; in
// scrolling mode the content flows and the whole page scrolls instead.
export function scrollBox(inner, options = {}) {
  const classes = ['scroll-box', options.className || ''].filter(Boolean).join(' ')
  const content = '<div class="scroll-box-content"' + (options.ariaLabel ? ' aria-label="' + escapeHTML(options.ariaLabel) + '"' : '') + '>' + inner + '</div>'
  if (ui.scrollMode) return '<div class="' + classes + '">' + content + '</div>'
  return '<div class="' + classes + '">' + content + '<div class="scroll-box-controls">' +
    gazeButton('↑', 'scroll-box', { data: { dir: '-1' }, ariaLabel: 'Scroll up' }) +
    gazeButton('↓', 'scroll-box', { data: { dir: '1' }, ariaLabel: 'Scroll down' }) + '</div></div>'
}

export function updateScrollBoxes(root = document) {
  root.querySelectorAll('.scroll-box').forEach(function (box) {
    const content = box.querySelector(':scope > .scroll-box-content')
    const controls = box.querySelector(':scope > .scroll-box-controls')
    if (!content || !controls) return
    const overflow = content.scrollHeight > content.clientHeight + 2
    box.classList.toggle('scroll-box--overflow', overflow)
    const [up, down] = controls.querySelectorAll('button')
    up.disabled = !overflow || content.scrollTop <= 2
    down.disabled = !overflow || content.scrollTop + content.clientHeight >= content.scrollHeight - 2
    if (!content.dataset.watched) {
      content.dataset.watched = 'true'
      content.addEventListener('scroll', function () { updateScrollBoxes(box.parentElement || document) })
    }
  })
}

export function scrollBoxBy(button) {
  const content = button.closest('.scroll-box')?.querySelector(':scope > .scroll-box-content')
  if (!content) return
  content.scrollBy({ top: Number(button.dataset.dir) * content.clientHeight * 0.72, behavior: 'smooth' })
  window.setTimeout(function () { updateScrollBoxes() }, 350)
}

export function noticeMarkup(notice) {
  if (!notice?.text) return ''
  const mark = notice.tone === 'done' ? '✓ ' : notice.tone === 'error' ? '! ' : ''
  return '<div class="inline-notice inline-notice--' + escapeHTML(notice.tone || 'info') + '" role="status">' + mark + escapeHTML(notice.text) + '</div>'
}

const STROKE = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'
const ICONS = {
  messages: '<rect x="9" y="15" width="46" height="34" rx="5" S/><path d="m11 19 21 17 21-17" S/>',
  errand: '<path d="M12 25h40l-5 25H17zM22 25c1-9 19-9 20 0" S/><path d="M24 34v9M40 34v9" S/>',
  calendar: '<rect x="12" y="14" width="40" height="38" rx="5" S/><path d="M12 25h40M22 9v10M42 9v10M23 35h2M32 35h2M41 35h2M23 43h2M32 43h2" S/>',
  internet: '<circle cx="32" cy="31" r="20" S/><path d="M12 31h40M32 11c10 11 10 29 0 40M32 11c-10 11-10 29 0 40M10 54h44" S/>',
  rides: '<path d="M10 40v-8l6-12h32l6 12v8a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4zM10 32h44" S/><circle cx="20" cy="44" r="5" S/><circle cx="44" cy="44" r="5" S/>',
  health: '<rect x="10" y="20" width="44" height="32" rx="6" S/><path d="M24 20v-7h16v7M27 28h10v7h7v10h-7v7H27v-7h-7V35h7z" S/>',
  settings: '<circle cx="32" cy="32" r="10" S/><circle cx="32" cy="32" r="22" stroke-dasharray="7 6" S/>',
  routines: '<path d="M8 46h48M28 45a13 13 0 0 1 26 0M12 25h16v17H12zM28 29h4a6 6 0 0 1 0 12h-4" S/><path d="M41 18v-6M51 23l4-4" S/>',
  'create workflow': '<rect x="12" y="23" width="28" height="26" rx="5" S/><rect x="20" y="15" width="28" height="26" rx="5" S/><path d="M44 50h14M52 44l6 6-6 6" S/>',
  help: '<circle cx="32" cy="32" r="24" S/><text x="32" y="42" text-anchor="middle" font-size="32" font-weight="700" fill="currentColor">?</text>',
  '← back': '<path d="M38 15 21 32l17 17M22 32h31" S/>',
  talk: '<path d="M12 14h40a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H30L18 54V44h-6a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" S/><path d="M22 29h2M31 29h2M40 29h2" S/>',
  accessibility: '<circle cx="32" cy="32" r="24" S/><circle cx="32" cy="19" r="3" S/><path d="M20 27l12 3 12-3M32 30v10l-6 11M32 40l6 11" S/>',
  'log out': '<path d="M28 12H16a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h12M38 22l10 10-10 10M48 32H24" S/>',
  'get help': '<path d="M32 10 56 52H8z" S/><path d="M32 26v12M32 45v1" S/>',
  eye: '<path d="M6 32s10-16 26-16 26 16 26 16-10 16-26 16S6 32 6 32z" S/><circle cx="32" cy="32" r="7" S/>',
  touch: '<path d="M26 34V14a4 4 0 0 1 8 0v16M34 28a4 4 0 0 1 8 0v4M42 30a4 4 0 0 1 8 0v8c0 10-6 16-15 16h-2c-6 0-9-3-13-8l-7-9a4 4 0 0 1 6-5l4 4" S/>',
  'last calibration': '<path d="M50 32a18 18 0 1 1-6-13.4M50 12v10H40" S/><circle cx="32" cy="32" r="4" S/>',
  'head pointer': '<circle cx="32" cy="27" r="13" S/><path d="M18 56c2-9 8-14 14-14s12 5 14 14M5 27h7M52 27h7M9 23l-4 4 4 4M55 23l4 4-4 4" S/>',
}

export function homeIcon(type) {
  const body = ICONS[type] || '<rect x="14" y="14" width="36" height="36" rx="8" S/><path d="M24 32h16M32 24v16" S/>'
  return '<svg viewBox="0 0 64 64" aria-hidden="true">' + body.replaceAll(' S/>', ' ' + STROKE + '/>') + '</svg>'
}
