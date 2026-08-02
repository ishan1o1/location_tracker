# TrackNTalk Client

Real-time location tracking and group chat web application.

## Room & State Lifecycle

Active rooms are maintained in server memory. They persist across page refreshes while the server is running but are lost if the server restarts.

## Authentication & Security Note

This application utilizes JWT (JSON Web Token) authentication for secure REST API endpoints and real-time Socket.IO connections.

### Token Storage Strategy
- **Current Implementation**: JWT tokens are stored in `localStorage` for client-side demo and standalone frontend-backend deployment convenience.
- **Production Best Practice**: In production environment setups, JWTs should be stored in **HttpOnly, SameSite, Secure Cookies** to mitigate Cross-Site Scripting (XSS) attacks and prevent client-side token extraction.

## Development

```bash
npm run dev
```
