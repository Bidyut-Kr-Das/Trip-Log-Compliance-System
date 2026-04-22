import LeftNavbar from '../components/LeftNavbar'
import MapPanel from '../components/MapPanel'
import RightSidebar from '../components/RightSidebar'

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <LeftNavbar />

      <main className="relative min-w-0 flex-1">
        <MapPanel />
        <RightSidebar />
      </main>
    </div>
  )
}
