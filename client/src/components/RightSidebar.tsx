import { useState } from 'react'
import AddressAutocompleteInput from './AddressAutocompleteInput'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function RightSidebar() {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [currentLocation, setCurrentLocation] = useState('1450 S Main St, Los Angeles, CA 90015')
  const [pickupLocation, setPickupLocation] = useState('1200 E 5th St, Los Angeles, CA 90013')
  const [dropoffLocation, setDropoffLocation] = useState('500 S Flower St, Los Angeles, CA 90071')

  return isPanelCollapsed ? (
    <button
      type="button"
      onClick={() => setIsPanelCollapsed(false)}
      aria-label="Open trip details"
      className="absolute right-5 top-5 z-[1200] flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-md transition hover:bg-white"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  ) : (
    <aside className="absolute right-5 top-5 bottom-5 z-[1200] flex w-[360px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trip details</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Route inputs</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsPanelCollapsed(true)}
          aria-label="Collapse trip details"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <AddressAutocompleteInput label="Current Location" value={currentLocation} onChange={setCurrentLocation} />

        <AddressAutocompleteInput label="Pickup Location" value={pickupLocation} onChange={setPickupLocation} />

        <AddressAutocompleteInput label="Dropoff Location" value={dropoffLocation} onChange={setDropoffLocation} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Current Cycle Used (Hrs)</span>
            <span className="text-sm font-semibold text-slate-900">4.5</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            step="0.5"
            defaultValue="4.5"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0</span>
            <span>70</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
