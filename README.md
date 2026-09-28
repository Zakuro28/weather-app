# Skyfall · Weather

A weather app whose sky changes with the conditions and time of day: sun and stars, dawn and dusk colours, drifting clouds, falling rain and snow, and lightning in storms.

## Features

- Live current weather, a 24-hour temperature chart and a 7-day forecast
- Wind compass, UV gauge, sunrise-to-sunset path, humidity, feels like, rain chance, visibility and pressure
- City search (press `/`) and "Use my location", with recent places remembered
- °C / °F switch
- Refreshes every 15 minutes
- Works on phones, and calms its animations for people who prefer reduced motion

## Built with

- [React](https://react.dev) + [Vite](https://vite.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Motion](https://motion.dev) for animation
- [Lucide](https://lucide.dev) icons
- Weather and city search from [Open-Meteo](https://open-meteo.com) (free, no API key)
- "Use my location" city names from [BigDataCloud](https://www.bigdatacloud.com)

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build for production

```bash
npm run build
```

The app is output to `dist/`, ready for Vercel, Netlify or GitHub Pages.
