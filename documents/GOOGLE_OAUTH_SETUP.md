# EffSync Google OAuth Setup

## Backend Environment Variables

Füge diese Variablen zu `.env` hinzu:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

## Wie du die Google OAuth Credentials bekommst

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle ein neues Projekt
3. Aktiviere die "Google+ API"
4. Gehe zu "Credentials" und erstelle eine "OAuth 2.0 Client ID"
5. Setze die Authorised redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Kopiere Client ID und Secret in deine `.env`

## Frontend Setup

Stelle sicher, dass die folgende ENV-Variable gesetzt ist:

```bash
VITE_API_URL=http://localhost:3000/api
```

Die ist normalerweise schon in `frontend/.env` oder `frontend/.env.local` vorhanden.

## Verwendung

1. Backend starten: `npm run start:dev`
2. Frontend starten: `npm run frontend`
3. In die Login-Page gehen und "Mit Google anmelden" klicken
4. Google wird dich zum OAuth-Flow leiten
5. Nach erfolgreicher Authentifizierung wirst du automatisch zum Dashboard weitergeleitet
