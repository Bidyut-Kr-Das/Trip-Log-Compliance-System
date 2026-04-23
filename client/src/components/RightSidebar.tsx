import { type FormEvent, useState } from 'react'
import AddressAutocompleteInput from './AddressAutocompleteInput'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AddressSuggestion } from '../types/address'
import type { RoutePoint, TripRouteResponse } from '../types/route'
import { fetchTripRoute } from '../services/routing'

type Props = {
  onRouteComputed?: (route: TripRouteResponse) => void
}

function suggestionToPoint(suggestion: AddressSuggestion): RoutePoint {
  return {
    label: suggestion.formatted,
    lat: suggestion.lat,
    lon: suggestion.lon,
  }
}

export default function RightSidebar({ onRouteComputed }: Props) {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [currentLocation, setCurrentLocation] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [currentPoint, setCurrentPoint] = useState<RoutePoint | null>(null)
  const [pickupPoint, setPickupPoint] = useState<RoutePoint | null>(null)
  const [dropoffPoint, setDropoffPoint] = useState<RoutePoint | null>(null)
  const [currentCycleUsedHours, setCurrentCycleUsedHours] = useState(4.5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const resetForm = () => {
    setCurrentLocation('')
    setPickupLocation('')
    setDropoffLocation('')
    setCurrentPoint(null)
    setPickupPoint(null)
    setDropoffPoint(null)
    setCurrentCycleUsedHours(4.5)
    setSubmitError('')
    setSubmitSuccess('')
  }

  const isValidPoint = (point: RoutePoint | null): point is RoutePoint =>
    Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lon))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedCurrentLocation = currentLocation.trim()
    const trimmedPickupLocation = pickupLocation.trim()
    const trimmedDropoffLocation = dropoffLocation.trim()

    if (!trimmedCurrentLocation || !trimmedPickupLocation || !trimmedDropoffLocation) {
      setSubmitError('Please fill out all trip fields before submitting.')
      setSubmitSuccess('')
      return
    }

    if (!isValidPoint(currentPoint) || !isValidPoint(pickupPoint) || !isValidPoint(dropoffPoint)) {
      setSubmitError('Please select each address from the autocomplete suggestions.')
      setSubmitSuccess('')
      return
    }

    if (!Number.isFinite(currentCycleUsedHours) || currentCycleUsedHours < 0 || currentCycleUsedHours > 70) {
      setSubmitError('Current cycle hours must be between 0 and 70.')
      setSubmitSuccess('')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const route = await fetchTripRoute({
        current_location: currentPoint,
        pickup_location: pickupPoint,
        dropoff_location: dropoffPoint,
        mode: 'drive',
      })

      onRouteComputed?.(route)
      resetForm()
      setSubmitSuccess('Route calculated successfully.')
    } catch {
      setSubmitError('Unable to calculate route right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <AddressAutocompleteInput
            label="Current Location"
            value={currentLocation}
            onChange={(value) => {
              setCurrentLocation(value)
              setCurrentPoint(null)
              setSubmitError('')
              setSubmitSuccess('')
            }}
            onSelectSuggestion={(suggestion) => {
              setCurrentPoint(suggestionToPoint(suggestion))
            }}
            placeholder="Start typing a current location"
          />

          <AddressAutocompleteInput
            label="Pickup Location"
            value={pickupLocation}
            onChange={(value) => {
              setPickupLocation(value)
              setPickupPoint(null)
              setSubmitError('')
              setSubmitSuccess('')
            }}
            onSelectSuggestion={(suggestion) => {
              setPickupPoint(suggestionToPoint(suggestion))
            }}
            placeholder="Start typing a pickup location"
          />

          <AddressAutocompleteInput
            label="Dropoff Location"
            value={dropoffLocation}
            onChange={(value) => {
              setDropoffLocation(value)
              setDropoffPoint(null)
              setSubmitError('')
              setSubmitSuccess('')
            }}
            onSelectSuggestion={(suggestion) => {
              setDropoffPoint(suggestionToPoint(suggestion))
            }}
            placeholder="Start typing a dropoff location"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Current Cycle Used (Hrs)</span>
              <span className="text-sm font-semibold text-slate-900">{currentCycleUsedHours.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="0.5"
              value={currentCycleUsedHours}
              onChange={(event) => {
                setCurrentCycleUsedHours(Number(event.target.value))
                setSubmitError('')
                setSubmitSuccess('')
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>70</span>
            </div>
          </div>

          {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}
          {submitSuccess ? <p className="text-sm text-emerald-600">{submitSuccess}</p> : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </form>
    </aside>
  )
}
