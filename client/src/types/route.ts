export type RoutePoint = {
  label?: string
  lat: number
  lon: number
}

export type TripRouteRequest = {
  current_location: RoutePoint
  pickup_location: RoutePoint
  dropoff_location: RoutePoint
  mode?: 'drive'
  details?: string
}

export type RouteLegStep = {
  instruction?: unknown
  distance?: number
  duration?: number
  time?: number
  name?: string
  road_class?: string
  surface?: string
}

export type RouteLeg = {
  distance?: number
  duration?: number
  time?: number
  steps?: RouteLegStep[]
}

export type RouteGeometry = {
  type: 'LineString' | 'MultiLineString' | string
  coordinates: number[][] | number[][][]
}

export type TripRouteResponse = {
  mode: string
  distance_meters: number
  duration_seconds: number
  waypoints: RoutePoint[]
  legs: RouteLeg[]
  geometry: RouteGeometry
}
