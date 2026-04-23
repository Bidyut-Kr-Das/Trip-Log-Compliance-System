import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import type { TripRouteResponse } from '../types/route'

const center: [number, number] = [34.0407, -118.2468]

type Props = {
  routeData: TripRouteResponse | null
}

type RouteSegment = {
  positions: [number, number][]
  color: string
}

const waypointStyles = [
  { fillColor: '#2563eb', strokeColor: '#1d4ed8', label: 'Current' },
  { fillColor: '#d97706', strokeColor: '#b45309', label: 'Pickup' },
  { fillColor: '#16a34a', strokeColor: '#15803d', label: 'Dropoff' },
]

const routeColors = ['#1d4ed8', '#e11d48']

function toLatLng([lon, lat]: number[]): [number, number] {
  return [lat, lon]
}

function buildWaypoints(routeData: TripRouteResponse | null): LatLngExpression[] {
  if (!routeData) {
    return []
  }

  return routeData.waypoints.map((waypoint) => [waypoint.lat, waypoint.lon])
}

function buildSegments(routeData: TripRouteResponse | null): RouteSegment[] {
  if (!routeData) {
    return []
  }

  const { geometry } = routeData

  if (geometry.type === 'LineString') {
    return [
      {
        positions: (geometry.coordinates as number[][]).map(toLatLng),
        color: routeColors[0],
      },
    ]
  }

  const lines = geometry.coordinates as number[][][]
  return lines.map((line, index) => ({
    positions: line.map(toLatLng),
    color: routeColors[index] ?? routeColors[routeColors.length - 1],
  }))
}

function RouteBounds({ routeData }: Props) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  useEffect(() => {
    hasFittedRef.current = false
  }, [routeData])

  useEffect(() => {
    if (hasFittedRef.current || !routeData) {
      return
    }

    const coordinates = routeData.geometry.coordinates
    const latLngs = routeData.geometry.type === 'LineString'
      ? (coordinates as number[][]).map(([lon, lat]) => [lat, lon] as [number, number])
      : (coordinates as number[][][]).flat().map(([lon, lat]) => [lat, lon] as [number, number])

    if (latLngs.length > 0) {
      map.fitBounds(latLngs as LatLngBoundsExpression, { padding: [24, 24] })
      hasFittedRef.current = true
    }
  }, [map, routeData])

  return null
}

export default function MapPanel({ routeData }: Props) {
  const routeSegments = useMemo(() => buildSegments(routeData), [routeData])
  const waypoints = useMemo(() => buildWaypoints(routeData), [routeData])

  return (
    <div className="relative h-full w-full">
      {routeData ? (
        <div className="absolute left-4 top-4 z-[1200] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
          <div className="space-y-1 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
              <span>Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span>Dropoff</span>
            </div>
          </div>
        </div>
      ) : null}

      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeSegments.map((segment, index) => (
          <Polyline
            key={`route-segment-${index}`}
            positions={segment.positions}
            pathOptions={{ color: segment.color, weight: 6, opacity: 0.9 }}
          />
        ))}
        {waypoints.map((position, index) => {
          const style = waypointStyles[index] ?? waypointStyles[waypointStyles.length - 1]

          return (
            <CircleMarker
              key={`waypoint-${index}`}
              center={position as [number, number]}
              radius={8}
              pathOptions={{
                color: style.strokeColor,
                fillColor: style.fillColor,
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                <span>
                  {style.label}
                  {routeData?.waypoints[index]?.label ? `: ${routeData.waypoints[index].label}` : ''}
                </span>
              </Tooltip>
            </CircleMarker>
          )
        })}
        {routeData ? <RouteBounds routeData={routeData} /> : null}
      </MapContainer>
    </div>
  )
}
