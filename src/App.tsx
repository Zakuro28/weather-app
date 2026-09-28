import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronDown, CloudOff, MapPin, RefreshCw } from 'lucide-react'
import SkyScene from './components/SkyScene'
import SearchPanel from './components/SearchPanel'
import Current from './components/Current'
import Hourly from './components/Hourly'
import Daily from './components/Daily'
import Details from './components/Details'
import { fetchForecast, kindOf, phaseOf, skyOf, timeLabel, type Forecast, type Place, type Units } from './lib/weather'

const MANILA: Place = { name: 'Manila', region: 'Metro Manila', country: 'Philippines', latitude: 14.6042, longitude: 120.9822 }

// Browser storage can be unavailable (private mode, blocked site data)
function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" aria-busy="true" aria-label="Loading weather">
      <div className="space-y-4">
        <div className="h-44 w-64 animate-pulse rounded-3xl bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="space-y-4">
        <div className="h-56 animate-pulse rounded-[28px] bg-white/10" />
        <div className="h-80 animate-pulse rounded-[28px] bg-white/10" />
      </div>
    </div>
  )
}

function UnitToggle({ units, onChange }: { units: Units; onChange: (u: Units) => void }) {
  return (
    <div role="radiogroup" aria-label="Temperature unit" className="relative flex rounded-full bg-black/20 p-1 backdrop-blur-md">
      {(['metric', 'imperial'] as const).map((u) => (
        <button
          key={u}
          role="radio"
          aria-checked={units === u}
          onClick={() => onChange(u)}
          className={`relative z-10 w-11 rounded-full py-1.5 text-sm font-semibold transition-colors ${units === u ? 'text-[#0e1628]' : 'text-white/75 hover:text-white'}`}
        >
          {units === u && (
            <motion.span layoutId="unit-pill" className="absolute inset-0 -z-10 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
          )}
          °{u === 'metric' ? 'C' : 'F'}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [place, setPlace] = useState<Place>(() => load('place', MANILA))
  const [recent, setRecent] = useState<Place[]>(() => load('recent', [MANILA]))
  const [units, setUnits] = useState<Units>(() => load('units', 'metric'))
  const [data, setData] = useState<Forecast | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const placeKey = `${place.latitude},${place.longitude}`

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    fetchForecast(place, units, ctrl.signal)
      .then((f) => setData(f))
      .catch((e) => {
        if (e.name !== 'AbortError') setError('We couldn’t load the weather. Check your connection, then try again.')
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false))
    return () => ctrl.abort()
  }, [place, units, reloadKey])

  // Refresh every 15 minutes while the tab is open
  useEffect(() => {
    const t = setInterval(() => setReloadKey((k) => k + 1), 15 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Press "/" to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const pick = useCallback((p: Place) => {
    setPlace(p)
    save('place', p)
    setRecent((r) => {
      const next = [p, ...r.filter((x) => x.latitude !== p.latitude || x.longitude !== p.longitude)].slice(0, 5)
      save('recent', next)
      return next
    })
    setSearchOpen(false)
  }, [])

  const changeUnits = (u: Units) => {
    setUnits(u)
    save('units', u)
  }

  const scene = useMemo(() => {
    if (!data) return { sky: skyOf('clear', 'night'), kind: 'clear' as const, phase: 'night' as const, code: 0, wind: 0 }
    const kind = kindOf(data.now.code)
    const phase = phaseOf(data.now.time, data.days[0].sunrise, data.days[0].sunset)
    return { sky: skyOf(kind, phase), kind, phase, code: data.now.code, wind: data.now.wind }
  }, [data])

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scene.sky.top)
  }, [scene.sky.top])

  return (
    <MotionConfig reducedMotion="user">
      <SkyScene {...scene} />

      <div className="mx-auto min-h-dvh max-w-6xl px-4 pt-5 pb-10 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex min-w-0 items-center gap-2.5 rounded-full py-2 pr-4 pl-3 text-left transition-colors hover:bg-white/10"
            aria-label={`Change location, currently ${place.name}`}
          >
            <MapPin className="size-5 shrink-0" aria-hidden />
            <AnimatePresence mode="wait">
              <motion.span
                key={placeKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="min-w-0"
              >
                <span className="block truncate text-lg font-semibold leading-tight">{place.name}</span>
                <span className="block truncate text-sm text-white/65">{[place.region, place.country].filter(Boolean).join(', ')}</span>
              </motion.span>
            </AnimatePresence>
            <ChevronDown className="size-4 shrink-0 text-white/60 transition-transform group-hover:translate-y-0.5" aria-hidden />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Refresh weather"
              className="grid size-10 place-items-center rounded-full bg-black/20 backdrop-blur-md transition-colors hover:bg-black/30"
            >
              <RefreshCw className={`size-4.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            </button>
            <UnitToggle units={units} onChange={changeUnits} />
          </div>
        </header>

        <main className="mt-8 sm:mt-12">
          {error && !data ? (
            <div className="panel mx-auto max-w-md p-8 text-center">
              <CloudOff className="mx-auto size-10 text-white/70" aria-hidden />
              <p className="mt-4 text-lg">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="mt-6 rounded-full bg-white px-6 py-2.5 font-semibold text-[#0e1628]">
                Try again
              </button>
            </div>
          ) : !data ? (
            <Skeleton />
          ) : (
            <motion.div key={`${placeKey}-${units}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-8">
                <div className="lg:sticky lg:top-10">
                  <Current data={data} unit={units === 'metric' ? 'C' : 'F'} />
                  <p className="mt-6 text-sm text-white/55">
                    Updated {timeLabel(data.now.time)} local time
                    {error && <span className="block text-amber-200">Couldn’t refresh. Showing the last update.</span>}
                  </p>
                </div>
                <div className="space-y-4 sm:space-y-5">
                  <Hourly hours={data.hours} placeKey={placeKey} />
                  <Daily days={data.days} nowTemp={data.now.temp} imperial={units === 'imperial'} placeKey={placeKey} />
                </div>
              </div>

              <div className="mt-4 sm:mt-5">
                <Details data={data} imperial={units === 'imperial'} />
              </div>
            </motion.div>
          )}
        </main>

        <footer className="mt-10 text-center text-sm text-white/50">
          Weather data from{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
            Open-Meteo
          </a>
          . Press <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-xs">/</kbd> to search.
        </footer>
      </div>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} onPick={pick} recent={recent} />
    </MotionConfig>
  )
}
