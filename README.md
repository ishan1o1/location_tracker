# Spotter — Real-Time Location Sharing

Spotter is a web application for sharing live locations with a group. Create or join a room, view members on a shared map, see distance and ETA information, and coordinate through room chat.

**Live app:** [Open the Spotter dashboard](https://location-tracker-azure-one.vercel.app/dashboard)

## Features

- Account registration and sign in with JWT-authenticated API and Socket.IO connections.
- Create named rooms and invite others using a room code; join existing rooms with a code.
- View your active rooms and resume a room session after navigating away or refreshing while the server is running.
- Share device location in real time, subject to browser location permission, and view room members on an interactive map.
- See driving distance and estimated travel time to other members when location data is available.
- Request and view a driving route to a selected room member; the route refreshes as members move.
- Send and receive live messages in the room.
- Update your display name and manage your account profile.
- Leave a room or, as its owner, delete it for all members.
- Responsive dashboard, map, and room panel layouts.

## Technology

**Frontend:** React 19, Vite 7, React Router, Tailwind CSS 4, Leaflet, React Leaflet, Socket.IO Client, Lottie React, Axios.

**Backend:** Node.js, Express 5, Socket.IO, MongoDB with Mongoose, JWT (`jsonwebtoken`), and `bcryptjs`.

**External services:** OpenStreetMap map tiles and OpenRouteService for driving directions, distance, and ETA.

**Deployment:** Frontend configured for Vercel with SPA route rewrites. The API and Socket.IO server are deployed separately.

## Project structure

```text
client/   React/Vite frontend
server/   Express API, MongoDB models, and Socket.IO server
```

## Run locally

Requirements: Node.js and npm, MongoDB, and an OpenRouteService API key for route and distance calculations.

1. Configure the backend environment in `server/.env`:

   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/locationTracker
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=7d
   ORS_API_KEY=your-openrouteservice-api-key
   ```

2. Install dependencies and start the backend:

   ```bash
   cd server
   npm install
   npm run dev
   ```

3. In a separate terminal, configure `client/.env` if the API is not at `http://localhost:5000`:

   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. Install dependencies and start the frontend:

   ```bash
   cd client
   npm install
   npm run dev
   ```

Open the local URL printed by Vite. The browser must grant location permission for live location sharing. Keep the server running while using rooms: room membership, locations, and messages are held in server memory and are cleared when the server restarts. Messages are live room messages and are not persisted.

## Production configuration

Set `VITE_API_URL` and `VITE_SOCKET_URL` for the frontend deployment, and `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `ORS_API_KEY` for the backend. Configure the backend CORS allowlist to include the frontend origin. Use a strong, private JWT secret; do not commit environment files or API keys.

## Available scripts

| Directory | Command | Description |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run build` | Build the production frontend |
| `client` | `npm run preview` | Preview the production build locally |
| `client` | `npm run lint` | Run ESLint |
| `server` | `npm run dev` | Start the backend with Nodemon |
| `server` | `npm start` | Start the backend with Node.js |
