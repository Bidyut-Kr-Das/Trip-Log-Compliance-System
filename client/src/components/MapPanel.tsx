import { MapContainer, TileLayer } from 'react-leaflet'

const center: [number, number] = [34.0407, -118.2468]

export default function MapPanel() {
  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  )
}
