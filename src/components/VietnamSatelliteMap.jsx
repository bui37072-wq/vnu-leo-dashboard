import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getGatewayPosition(gatewayId) {
  const gatewayPositions = {
    'GW-HN': [21.0285, 105.8542],
    'GW-DN': [16.0544, 108.2022],
    'GW-HCM': [10.8231, 106.6297]
  };

  return gatewayPositions[gatewayId] || [16.0544, 108.2022];
}

function getSatelliteColor(status) {
  if (status === 'Online') return '#2563eb';
  if (status === 'Warning') return '#f59e0b';
  return '#ef4444';
}

export default function VietnamSatelliteMap({ satellites, gateways }) {
  return (
    <div className="real-map-wrapper">
      <MapContainer
        center={[16.0, 106.0]}
        zoom={5}
        minZoom={5}
        maxZoom={8}
        scrollWheelZoom={true}
        className="real-vietnam-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {gateways.map((gw) => {
          const position = [gw.latitude, gw.longitude];

          return (
            <CircleMarker
              key={gw.id}
              center={position}
              radius={9}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#ef4444',
                fillOpacity: 0.9
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent>
                {gw.id}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {satellites
          .filter((sat) => sat.status !== 'Offline')
          .map((sat) => {
            const satPosition = [sat.latitude, sat.longitude];
            const gatewayPosition = getGatewayPosition(sat.gateway);

            return (
              <div key={sat.id}>
                <CircleMarker
                  center={satPosition}
                  radius={5}
                  pathOptions={{
                    color: getSatelliteColor(sat.status),
                    fillColor: getSatelliteColor(sat.status),
                    fillOpacity: 0.85
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <div>
                      <strong>{sat.id}</strong>
                      <br />
                      Orbit: {sat.orbit}
                      <br />
                      Gateway: {sat.gateway}
                      <br />
                      Coverage: {sat.coverage}
                      <br />
                      Signal: {sat.signalQuality}%
                    </div>
                  </Tooltip>
                </CircleMarker>

                <Circle
                  center={satPosition}
                  radius={350000}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#60a5fa',
                    fillOpacity: 0.05,
                    weight: 1
                  }}
                />

                <Polyline
                  positions={[satPosition, gatewayPosition]}
                  pathOptions={{
                    color: '#2563eb',
                    weight: 1,
                    opacity: 0.35,
                    dashArray: '6 6'
                  }}
                />
              </div>
            );
          })}
      </MapContainer>
    </div>
  );
}