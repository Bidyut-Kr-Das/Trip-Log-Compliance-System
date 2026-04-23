import { useState } from 'react'
import LeftNavbar from '../components/LeftNavbar'
import MapPanel from '../components/MapPanel'
import RightSidebar from '../components/RightSidebar'
import type { TripRouteResponse } from '../types/route'

export default function DashboardPage() {
  const [routeData, setRouteData] = useState<TripRouteResponse | null>(null)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <LeftNavbar />

      <main className="relative min-w-0 flex-1">
        <MapPanel routeData={routeData} />
        <RightSidebar onRouteComputed={setRouteData} />
      </main>
    </div>
  )
}
