import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import myPin from "../assets/mypin.png";

const myIcon = new L.Icon({
  iconUrl: myPin,
  iconSize: [50, 70],
  iconAnchor: [25, 70],
  popupAnchor: [0, -60],
});

const Map = ({ users, mySocketId, route, selectedUser, selectedUserId }) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("GEO OK", position.coords);
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
      },
      (err) => {
        console.error("GEO ERROR", err);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  function FitBounds({ me, selectedUser }) {
    const map = useMap();
    useEffect(() => {
      if (
        me &&
        selectedUser &&
        me.lat &&
        me.lng &&
        selectedUser.lat &&
        selectedUser.lng
      ) {
        const bounds = L.latLngBounds([
          [me.lat, me.lng],
          [selectedUser.lat, selectedUser.lng],
        ]);
        map.fitBounds(bounds, { padding: [80, 80] });
      } else if (me && me.lat && me.lng) {
        map.setView([me.lat, me.lng], 17);
      }
    }, [me, selectedUser, map]);
    return null;
  }

  // Find yourself in the users array
  const me = users.find((u) => u.userId === mySocketId);

  // Extract polyline coordinates from GeoJSON
  let polylineCoords = [];
  if (route && route.features && route.features[0]) {
    polylineCoords = route.features[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );
  }
  if (!currentLocation) return <div>Loading...</div>;
  return (
    <MapContainer
      center={currentLocation || [0, 0]}
      zoom={17}
      style={{ height: "100vh", width: "100%" }}
      className="shadow-lg"
    >
      <FitBounds me={me} selectedUser={selectedUser} />
      <TileLayer
        attribution="slrTech"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      {/* Your marker */}
      {currentLocation && (
        <Marker position={currentLocation} icon={myIcon}>
             <Tooltip
    direction="top"
    offset={[0, -60]}
    permanent
    className="user-label"
  >
    {users.userId}
  </Tooltip>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Other users */}
      {users
        .filter((user) => user.userId !== mySocketId)
        .map(
          (user) =>
            user.lat &&
            user.lng && (
              <Marker
                key={user.userId}
                position={[user.lat, user.lng]}
                icon={
                  selectedUserId === user.userId
                    ? new L.Icon({
                        iconUrl: myPin,
                        iconSize: [60, 80],
                        className: "border-4 border-yellow-500",
                      })
                    : new L.Icon({ iconUrl: myPin, iconSize: [50, 70] })
                }
              >
                <Popup>
                  <span
                    className={
                      selectedUserId === user.userId
                        ? "font-bold text-green-600"
                        : ""
                    }
                  >
                    User: {user.userId}
                  </span>
                  <br />
                  Distance: {user.distance ?? "N/A"} km <br />
                  ETA: {user.eta ?? "N/A"} min
                </Popup>
              </Marker>
            )
        )}
      {polylineCoords.length > 0 && (
        <Polyline
          positions={polylineCoords}
          color="#F9A825"
          weight={6}
          opacity={0.8}
        />
      )}
    </MapContainer>
  );
};

export default Map;
