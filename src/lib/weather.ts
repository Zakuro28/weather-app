// Open-Meteo: free, no API key. https://open-meteo.com
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export type Units = 'metric' | 'imperial'

export type Place = {
  name: string
  region?: string
  country?: string
  latitude: number
  longitude: number
}

export type Hour = { time: string; temp: number; code: number; isDay: boolean; rainChance: number }
export type Day = {
  date: string
  code: number
  max: number
  min: number
  rainChance: number
  sunrise: string
  sunset: string
  uv: number
}

export type Forecast = {
  timezone: string
  now: {
    time: string
    temp: number
    feelsLike: number
    humidity: number
    isDay: boolean
    code: number
    wind: number
    windDir: number
    gusts: number
    pressure: number
    cloud: number
    precipitation: number
    visibility: number
    dewPoint: number
    uv: number
  }
  hours: Hour[] // next 24 hours from now
  days: Day[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchForecast(p: Place, units: Units, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(p.latitude),
    longitude: String(p.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day,visibility,dew_point_2m,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
  })
  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit')
    params.set('wind_speed_unit', 'mph')
    params.set('precipitation_unit', 'inch')
  }

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`)
  const d: any = await res.json()

  const c = d.current
  const h = d.hourly
  // First hourly slot at or after the current hour
  const nowHour = c.time.slice(0, 13)
  let start = h.time.findIndex((t: string) => t.slice(0, 13) >= nowHour)
  if (start < 0) start = 0

  const hours: Hour[] = h.time.slice(start, start + 24).map((t: string, i: number) => ({
    time: t,
    temp: h.temperature_2m[start + i],
    code: h.weather_code[start + i],
    isDay: h.is_day[start + i] === 1,
    rainChance: h.precipitation_probability[start + i] ?? 0,
  }))

  const days: Day[] = d.daily.time.map((t: string, i: number) => ({
    date: t,
    code: d.daily.weather_code[i],
    max: d.daily.temperature_2m_max[i],
    min: d.daily.temperature_2m_min[i],
    rainChance: d.daily.precipitation_probability_max[i] ?? 0,
    sunrise: d.daily.sunrise[i],
    sunset: d.daily.sunset[i],
    uv: d.daily.uv_index_max[i] ?? 0,
  }))

  return {
    timezone: d.timezone,
    now: {
      time: c.time,
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      isDay: c.is_day === 1,
      code: c.weather_code,
      wind: c.wind_speed_10m,
      windDir: c.wind_direction_10m,
      gusts: c.wind_gusts_10m,
      pressure: c.pressure_msl,
      cloud: c.cloud_cover,
      precipitation: c.precipitation,
      visibility: h.visibility[start] ?? 0,
      dewPoint: h.dew_point_2m[start] ?? 0,
      uv: h.uv_index[start] ?? 0,
    },
    hours,
    days,
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' })}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const d: any = await res.json()
  return (d.results ?? []).map((r: any) => ({
    name: r.name,
    region: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

// City name for "Use my location" (BigDataCloud's free client endpoint, no key)
export async function placeFromCoords(latitude: number, longitude: number): Promise<Place> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )
    const d: any = await res.json()
    return {
      name: d.city || d.locality || 'Your location',
      region: d.principalSubdivision || undefined,
      country: d.countryName || undefined,
      latitude,
      longitude,
    }
  } catch {
    return { name: 'Your location', latitude, longitude }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------- Conditions ---------- */

export type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export function kindOf(code: number): Kind {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

const labels: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
}

export const labelOf = (code: number) => labels[code] ?? 'Cloudy'

export function iconOf(code: number, isDay = true): LucideIcon {
  switch (kindOf(code)) {
    case 'clear':
      return isDay ? Sun : Moon
    case 'partly':
      return isDay ? CloudSun : CloudMoon
    case 'cloudy':
      return Cloud
    case 'fog':
      return CloudFog
    case 'drizzle':
      return CloudDrizzle
    case 'rain':
      return code >= 80 ? (isDay ? CloudSunRain : CloudMoonRain) : CloudRain
    case 'snow':
      return CloudSnow
    case 'storm':
      return CloudLightning
  }
}

/* ---------- Sky palette ---------- */

export type Phase = 'day' | 'night' | 'dawn' | 'dusk'

// Within 50 minutes of sunrise or sunset counts as dawn or dusk
export function phaseOf(nowIso: string, sunriseIso: string, sunsetIso: string): Phase {
  const now = new Date(nowIso).getTime()
  const rise = new Date(sunriseIso).getTime()
  const set = new Date(sunsetIso).getTime()
  const win = 50 * 60 * 1000
  if (Math.abs(now - rise) < win) return 'dawn'
  if (Math.abs(now - set) < win) return 'dusk'
  return now > rise && now < set ? 'day' : 'night'
}

export type Sky = { top: string; bottom: string; glow: string; key: string }

/** sunHeight: 0 on the horizon, 1 at noon */
export function skyOf(kind: Kind, phase: Phase, sunHeight = 1): Sky {
  const night = phase === 'night'
  const golden = phase === 'dawn' || phase === 'dusk'
  const key = `${kind}-${phase}`

  if (kind === 'storm') return night ? { top: '#040509', bottom: '#191e2b', glow: '#6d7aa8', key } : { top: '#171c27', bottom: '#3d4658', glow: '#9aa6c4', key }
  if (kind === 'rain')
    return night ? { top: '#060b15', bottom: '#1c2a3e', glow: '#5c7aa3', key } : { top: '#2b3a4e', bottom: '#65788f', glow: '#b7c8dc', key }
  if (kind === 'drizzle')
    return night ? { top: '#0a1220', bottom: '#2a3a52', glow: '#5c7aa3', key } : { top: '#3c4f68', bottom: '#8499b1', glow: '#c9d6e6', key }
  if (kind === 'snow') return night ? { top: '#141c30', bottom: '#4a5b7a', glow: '#c6d6f0', key } : { top: '#5a7596', bottom: '#a9bdd4', glow: '#ffffff', key }
  if (kind === 'fog') return night ? { top: '#1a1f28', bottom: '#454d5a', glow: '#98a2b3', key } : { top: '#6f7c8c', bottom: '#b3bcc6', glow: '#e8edf2', key }
  if (golden) return phase === 'dawn' ? { top: '#2d3a78', bottom: '#f39c7a', glow: '#ffd29a', key } : { top: '#2a1f5c', bottom: '#f07a5a', glow: '#ffb56b', key }
  if (night) return kind === 'clear' ? { top: '#01030a', bottom: '#131d3d', glow: '#a9b8ff', key } : { top: '#04070f', bottom: '#1d2640', glow: '#8d9ac4', key }
  if (kind === 'cloudy') return { top: '#50627a', bottom: '#98abc2', glow: '#e4ebf3', key }

  // Clear daytime: warm and soft when the sun is low, deep blue and bright at noon
  const h = Math.max(0, Math.min(1, sunHeight))
  return {
    top: mix('#3a6fc4', '#1a63d6', h),
    bottom: mix('#ffcf9e', '#8ec9ff', h),
    glow: mix('#ffd08a', '#fff6d0', h),
    key: `${key}-${Math.round(h * 5)}`,
  }
}

/** Is it raining hard enough (or storming) for lightning? */
export function hasLightning(code: number) {
  return [65, 67, 82, 95, 96, 99].includes(code)
}

/** 0 at sunrise, 1 at sunset; null when the sun is down */
export function sunProgress(nowIso: string, sunriseIso: string, sunsetIso: string) {
  const n = minutesOfDay(nowIso)
  const r = minutesOfDay(sunriseIso)
  const s = minutesOfDay(sunsetIso)
  if (n < r || n > s) return null
  return (n - r) / (s - r)
}

/** 0 at sunset, 1 at the next sunrise */
export function nightProgress(nowIso: string, sunriseIso: string, sunsetIso: string) {
  const n = minutesOfDay(nowIso)
  const r = minutesOfDay(sunriseIso)
  const s = minutesOfDay(sunsetIso)
  const length = 1440 - s + r
  const since = n > s ? n - s : n + 1440 - s
  return Math.min(1, since / length)
}

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/* ---------- Formatting ---------- */

export const round = (n: number) => Math.round(n)

export type Clock = '12h' | '24h'

// Open-Meteo returns local times without an offset; read the clock digits directly
export function hourLabel(iso: string, clock: Clock = '12h') {
  const h = Number(iso.slice(11, 13))
  if (clock === '24h') return `${String(h).padStart(2, '0')}:00`
  const suffix = h < 12 ? 'am' : 'pm'
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`
}

export function timeLabel(iso: string, clock: Clock = '12h') {
  const h = Number(iso.slice(11, 13))
  const m = iso.slice(14, 16)
  if (clock === '24h') return `${String(h).padStart(2, '0')}:${m}`
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'am' : 'pm'}`
}

/** The time right now in a place's time zone, e.g. "4:57 pm" or "16:57" */
export function clockNow(timeZone: string, clock: Clock) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hourCycle: clock === '24h' ? 'h23' : 'h12' }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  if (clock === '24h') return `${get('hour').padStart(2, '0')}:${get('minute')}`
  return `${get('hour')}:${get('minute')} ${get('dayPeriod').toLowerCase()}`
}

export function dayLabel(date: string, index: number) {
  if (index === 0) return 'Today'
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export function minutesOfDay(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))
}

export const compass = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8]

export function uvLabel(uv: number) {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very high'
  return 'Extreme'
}
