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

const getDisplayName = (user, fallback = "User") => user?.name || fallback;

const Map = ({
  users = [],
  mySocketId,
  route,
  routeInfo,
  routeLoading,
  selectedUser,
  selectedUserId,
  onSelectUser,
  onShowRoute,
  onClearRoute,
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
        },
        (err) => {
          console.error("GEO ERROR", err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  function FitBounds({ me, selectedUser, polylineCoords }) {
    const map = useMap();
    useEffect(() => {
      if (polylineCoords && polylineCoords.length > 0) {
        const bounds = L.latLngBounds(polylineCoords);
        map.fitBounds(bounds, { padding: [80, 80] });
      } else if (
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
    }, [me, selectedUser, polylineCoords, map]);
    return null;
  }

  const me = users.find((u) => u.isMe || u.userId === mySocketId);
  const myMarkerPosition = me?.lat && me?.lng ? [me.lat, me.lng] : currentLocation;
  const initialCenter = myMarkerPosition || currentLocation || [20.5937, 78.9629];

  let polylineCoords = [];
  if (route && route.features && route.features[0] && route.features[0].geometry) {
    polylineCoords = route.features[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Floating Route Info Panel */}
      {selectedUser && (route || routeLoading || routeInfo) && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(17, 24, 39, 0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 12,
            padding: "0.65rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Route to {getDisplayName(selectedUser)}
            </div>
            {routeLoading ? (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#818cf8",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>Calculating optimal route...</span>
              </div>
            ) : routeInfo ? (
              <div
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  gap: "0.85rem",
                  alignItems: "center",
                  marginTop: "0.1rem",
                }}
              >
                <span>📍 {routeInfo.distance}</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span>⏱️ {routeInfo.duration}</span>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => onClearRoute?.()}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              borderRadius: 8,
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Clear Route
          </button>
        </div>
      )}

      <MapContainer
        center={initialCenter}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
        className="shadow-lg"
      >
        <FitBounds me={me} selectedUser={selectedUser} polylineCoords={polylineCoords} />
        <TileLayer
          attribution="slrTech"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {/* Current User Marker */}
        {myMarkerPosition && (
          <Marker position={myMarkerPosition} icon={myIcon}>
            <Tooltip
              direction="top"
              offset={[0, -60]}
              permanent
              className="user-label"
            >
              {getDisplayName(me, "You")}
            </Tooltip>
            <Popup>
              <div style={{ fontWeight: 700, color: "#111", padding: "0.2rem 0" }}>
                {getDisplayName(me, "You")} <span style={{ color: "#6366f1", fontSize: "0.8rem" }}>(You)</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other Members' Markers */}
        {users
          .filter((user) => !user.isMe && user.userId !== mySocketId)
          .map(
            (user) =>
              user.lat &&
              user.lng && (
                <Marker
                  key={user.userId}
                  position={[user.lat, user.lng]}
                  eventHandlers={{
                    click: () => onSelectUser?.(user),
                  }}
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
                  <Tooltip
                    direction="top"
                    offset={[0, -60]}
                    permanent
                    className="user-label"
                  >
                    {getDisplayName(user)}
                  </Tooltip>
                  <Popup>
                    <div
                      style={{
                        minWidth: 170,
                        padding: "0.25rem 0",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          color: "#111",
                          marginBottom: "0.3rem",
                        }}
                      >
                        {getDisplayName(user)}
                      </div>

                      {selectedUserId === user.userId && routeInfo && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#374151",
                            background: "#f3f4f6",
                            padding: "0.45rem 0.6rem",
                            borderRadius: 6,
                            marginBottom: "0.55rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.2rem",
                          }}
                        >
                          <div>
                            <strong>Distance:</strong> {routeInfo.distance}
                          </div>
                          <div>
                            <strong>ETA:</strong> {routeInfo.duration}
                          </div>
                        </div>
                      )}

                      {selectedUserId === user.userId && route ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearRoute?.();
                          }}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Clear Route
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowRoute?.(user);
                          }}
                          disabled={routeLoading && selectedUserId === user.userId}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            background: "#4f46e5",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor:
                              routeLoading && selectedUserId === user.userId
                                ? "wait"
                                : "pointer",
                            opacity:
                              routeLoading && selectedUserId === user.userId
                                ? 0.7
                                : 1,
                          }}
                        >
                          {routeLoading && selectedUserId === user.userId
                            ? "Calculating..."
                            : "Show Route"}
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
          )}

        {/* Polylines for Route */}
        {polylineCoords.length > 0 && (
          <>
            {/* Outer Glowing Stroke */}
            <Polyline
              positions={polylineCoords}
              color="#4f46e5"
              weight={9}
              opacity={0.45}
            />
            {/* Inner Main Polyline */}
            <Polyline
              positions={polylineCoords}
              color="#6366f1"
              weight={4}
              opacity={0.9}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;