import { EventEmitter } from 'events'

const globalForEvents = globalThis as unknown as { appEmitter?: EventEmitter }
export const appEmitter = globalForEvents.appEmitter || new EventEmitter()
appEmitter.setMaxListeners(100) // Support many TV screens
if (process.env.NODE_ENV !== 'production') globalForEvents.appEmitter = appEmitter

export const EVENT_TYPES = {
  PLAYLIST_UPDATED: 'PLAYLIST_UPDATED',
  SCREEN_RELOAD: 'SCREEN_RELOAD',
} as const
