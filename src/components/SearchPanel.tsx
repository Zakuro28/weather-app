import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { placeFromCoords, searchPlaces, type Place } from '../lib/weather'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (p: Place) => void
  recent: Place[]
}

export default function SearchPanel({ open, onClose, onPick, recent }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle')
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setStatus('idle')
      setLocateError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced city search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    const ctrl = new AbortController()
    setStatus('loading')
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, ctrl.signal)
        setResults(r)
        setActive(0)
        setStatus(r.length ? 'idle' : 'empty')
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus('error')
      }
    }, 280)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Your browser can’t share its location. Search for your city instead.')
      return
    }
    setLocating(true)
    setLocateError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = await placeFromCoords(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
        onPick(p)
      },
      () => {
        setLocating(false)
        setLocateError('Location access was blocked. Allow it in your browser settings, or search for your city.')
      },
      { timeout: 10000 },
    )
  }

  const list = query.trim().length >= 2 ? results : recent

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Change location"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-[#0e1628]/80 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5">
              <Search className="size-5 shrink-0 text-white/50" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
                  if (e.key === 'Enter' && list[active]) onPick(list[active])
                }}
                placeholder="Search a city"
                aria-label="Search a city"
                className="h-16 w-full bg-transparent text-lg text-white outline-none placeholder:text-white/40"
              />
              {status === 'loading' && <Loader className="size-4.5 shrink-0 animate-spin text-white/50" aria-hidden />}
              <button type="button" onClick={onClose} aria-label="Close search" className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/90 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {locating ? <Loader className="size-4.5 animate-spin text-sky-300" aria-hidden /> : <LocateFixed className="size-4.5 text-sky-300" aria-hidden />}
                {locating ? 'Finding you…' : 'Use my location'}
              </button>
              {locateError && <p className="px-4 pb-2 text-sm text-amber-200">{locateError}</p>}

              {list.length > 0 && (
                <p className="px-4 pt-3 pb-1 text-xs text-white/45">{query.trim().length >= 2 ? 'Results' : 'Recent'}</p>
              )}
              <ul role="listbox" aria-label="Places">
                {list.map((p, i) => (
                  <motion.li
                    key={`${p.latitude},${p.longitude}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.035 }}
                    role="option"
                    aria-selected={i === active}
                  >
                    <button
                      type="button"
                      onClick={() => onPick(p)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${i === active ? 'bg-white/12' : ''}`}
                    >
                      <MapPin className="size-4.5 shrink-0 text-white/45" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-white">{p.name}</span>
                        <span className="block truncate text-sm text-white/50">{[p.region, p.country].filter(Boolean).join(', ')}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
              {status === 'empty' && <p className="px-4 py-4 text-sm text-white/60">No places match “{query.trim()}”. Check the spelling or try a nearby city.</p>}
              {status === 'error' && <p className="px-4 py-4 text-sm text-amber-200">Search isn’t responding. Check your connection and try again.</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
