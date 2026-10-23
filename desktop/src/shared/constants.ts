// The password is intentionally hardcoded (per spec). The server checks the same value.
export const SHARED_PASSWORD = 'buddy123'
export const DEFAULT_SERVER_URL = 'ws://localhost:8080'
export const DEFAULT_ROOM = 'home'
export const MAX_CUSTOM_LENGTH = 80

export const STATUS_KINDS = ['working', 'lunch', 'meeting', 'coffee', 'workout', 'sleeping', 'away', 'custom'] as const

export const STATUS_LABELS: Record<string, string> = {
  working: 'Doing work',
  lunch: 'At lunch',
  meeting: 'In a meeting',
  coffee: 'Coffee break',
  workout: 'Working out',
  sleeping: 'Sleeping',
  away: 'Away',
  custom: 'Custom'
}
