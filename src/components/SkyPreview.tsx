import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Cloudy,
  Eye,
  Moon,
  MoonStar,
  Radio,
  Sun,
  Sunrise,
  Sunset,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Phase } from '../lib/weather'

export type Preset = { id: string; label: string; icon: LucideIcon; code: number; phase: Phase; sunT: number | null; moonT?: number; wind?: number }

export const PRESETS: Preset[] = [
  { id: 'sunrise', label: 'Sunrise', icon: Sunrise, code: 0, phase: 'dawn', sunT: 0.03 },
  { id: 'morning', label: 'Sunny morning', icon: Sun, code: 0, phase: 'day', sunT: 0.18 },
  { id: 'noon', label: 'Sunny noon', icon: Sun, code: 1, phase: 'day', sunT: 0.5 },
  { id: 'sunset', label: 'Sunset', icon: Sunset, code: 0, phase: 'dusk', sunT: 0.97 },
  { id: 'night', label: 'Clear night', icon: MoonStar, code: 0, phase: 'night', sunT: null, moonT: 0.35 },
  { id: 'cloudy', label: 'Cloudy', icon: Cloudy, code: 3, phase: 'day', sunT: 0.4 },
  { id: 'rain', label: 'Rain', icon: CloudRain, code: 63, phase: 'day', sunT: 0.45, wind: 14 },
  { id: 'heavy', label: 'Heavy rain', icon: CloudRainWind, code: 65, phase: 'day', sunT: 0.55, wind: 30 },
  { id: 'storm', label: 'Thunderstorm', icon: CloudLightning, code: 95, phase: 'day', sunT: 0.6, wind: 38 },
  { id: 'night-storm', label: 'Night storm', icon: Moon, code: 95, phase: 'night', sunT: null, moonT: 0.5, wind: 38 },
  { id: 'snow', label: 'Snow', icon: CloudSnow, code: 73, phase: 'day', sunT: 0.45, wind: 8 },
  { id: 'fog', label: 'Fog', icon: CloudFog, code: 45, phase: 'day', sunT: 0.3 },
]

type Props = { active: Preset | null; onChange: (p: Preset | null) => void }

export default function SkyPreview({ active, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Reminder that the sky isn't live */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/45 py-1.5 pr-1.5 pl-4 text-sm backdrop-blur-md"
            role="status"
          >
            <Eye className="size-4" aria-hidden />
            Previewing {active.label.toLowerCase()}
            <button type="button" onClick={() => onChange(null)} className="rounded-full bg-white px-3 py-1 font-semibold text-[#0e1628]">
              Back to live
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {open && (
            <motion.div
              id="sky-preview"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-[min(92vw,22rem)] origin-bottom-right rounded-[24px] border border-white/15 bg-[#0e1628]/80 p-3 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-sm text-white/70">Preview the sky</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close preview" className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  aria-pressed={!active}
                  className={`col-span-2 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${!active ? 'bg-white text-[#0e1628]' : 'bg-white/8 text-white hover:bg-white/15'}`}
                >
                  <Radio className="size-4" aria-hidden /> Live weather
                </button>
                {PRESETS.map((p, i) => {
                  const Icon = p.icon
                  const on = active?.id === p.id
                  return (
                    <motion.button
                      key={p.id}
                      type="button"
                      onClick={() => onChange(p)}
                      aria-pressed={on}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${on ? 'bg-white font-semibold text-[#0e1628]' : 'bg-white/8 text-white hover:bg-white/15'}`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {p.label}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="sky-preview"
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md transition-colors hover:bg-black/50"
        >
          <Eye className="size-4" aria-hidden />
          Preview sky
        </motion.button>
      </div>
    </>
  )
}
