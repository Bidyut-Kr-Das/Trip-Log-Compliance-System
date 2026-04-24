import { useState } from 'react'
import LeftNavbar from '../components/LeftNavbar'
import LogPanel from '../components/LogPanel'
import MapPanel from '../components/MapPanel'
import RightSidebar from '../components/RightSidebar'
import type { TripRouteResponse, TripTimelineResponse } from '../types/route'

export default function DashboardPage() {
  const [routeData, setRouteData] = useState<TripRouteResponse | null>(null)
  const [timelineData, setTimelineData] = useState<TripTimelineResponse | null>(null)
  const [activeView, setActiveView] = useState<'map' | 'log'>('map')

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <LeftNavbar />

      <main className="relative min-w-0 flex-1">
        <div className="absolute left-1/2 top-5 z-[1300] -translate-x-1/2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-2xl backdrop-blur-md">
          <div role="tablist" aria-label="Main sections" className="flex items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'map'}
              aria-controls="map-panel"
              onClick={() => setActiveView('map')}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                activeView === 'map'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'log'}
              aria-controls="log-panel"
              onClick={() => setActiveView('log')}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                activeView === 'log'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Log
            </button>
          </div>
        </div>

        <div className="relative h-full w-full overflow-hidden">
          <section
            id="map-panel"
            role="tabpanel"
            aria-hidden={activeView !== 'map'}
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              activeView === 'map' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
            }`}
          >
            <MapPanel routeData={routeData} />
          </section>

          <section
            id="log-panel"
            role="tabpanel"
            aria-hidden={activeView !== 'log'}
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              activeView === 'log' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
            }`}
          >
            <LogPanel timelineData={timelineData} />
          </section>
        </div>

        <RightSidebar onRouteComputed={setRouteData} onTimelineComputed={setTimelineData} />
      </main>
    </div>
  )
}
