// Menu content for the design's tile flows. Routines, the errand menu, and
// insurance are demo-only and end with a "Demo only" notice; Settings can hide them.

export const FEATURE_FLOWS = {
  morning: ['today overview', 'medications', 'transportation'],
  'catch up': ['messages', 'calendar', 'tasks'],
  errand: ['groceries', 'pharmacy', 'package'],
  health: ['appointments', 'medications', 'insurance'],
}

export const SECOND_STEPS = {
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
  errand: {
    groceries: ['today', 'tomorrow'],
    pharmacy: ['today', 'tomorrow'],
    package: ['send package', 'track package'],
  },
  health: {
    appointments: ['new appointment', 'manage appointments'],
    medications: ['check today', 'request refill'],
    insurance: ['check coverage', 'find provider'],
  },
}

// Saved workflows are website tasks: Twinly researches or prepares them and
// stops before submitting, booking, or paying.
export const WORKFLOW_SUGGESTIONS = ['Find my clinic’s phone number and hours', 'Check my pharmacy order status', 'Look up bus times to my next appointment']
export const APPOINTMENT_TYPES = ['follow up primary', 'specialist appointment', 'discover appointment']
export const APPOINTMENT_URGENCY = ['as soon as possible', 'find best time']
export const APPOINTMENT_TIMES = ['morning', 'afternoon', 'any time']
export const QUICK_REPLIES = ['I will be there.', 'Please call me.', 'Thank you.']

export function builderWords(draft) {
  if (!draft) return ['I', 'Yes', 'No', 'Please', 'Thank you']
  if (draft.endsWith('I')) return ['can', 'will', 'need', 'am', 'cannot']
  return ['come', 'call', 'confirm', 'help', 'tomorrow']
}
