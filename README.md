# Škola matematike Infinito — MVP sajt za zakazivanje

Ovaj paket sadrži:

- `frontend/` — React + Vite sajt
- `backend/` — Spring Boot API
- termini za 8–13. jun 2026.
- zauzeti termini: Danilo i Marko
- online / uživo termini
- forma za rezervaciju: ime, email za online, telefon/email za uživo, nivo, oblast, cena
- backend priprema mesto za Google Calendar + Google Meet integraciju

## 1. Pokretanje lokalno

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Ako nemaš `mvnw`, koristi:

```bash
mvn spring-boot:run
```

Backend se pokreće na:

```text
http://localhost:8080
```

### Frontend

U drugom terminalu:

```bash
cd frontend
npm install
npm run dev
```

Frontend se otvara na:

```text
http://localhost:5173
```

## 2. Kako radi zakazivanje

1. Učenik izabere slobodan termin.
2. Ako je termin online, mora da unese email.
3. Izabere nivo: redovna nastava, mala matura, takmičenja/prijemni ili fakultet.
4. Upiše oblast.
5. Klikne „Rezerviši termin”.
6. Termin se označi kao zauzet i vidi se u listi rezervisanih.

## 3. Google Calendar + Google Meet

U kodu postoji `CalendarService`, ali je trenutno u MVP fallback modu da projekat može odmah da radi lokalno.

Za pravu produkciju treba uključiti Google Calendar API i OAuth nalog Ane `avucicevic2002@gmail.com`.

Potrebno je:

1. Otvori Google Cloud Console.
2. Napravi novi project, npr. `infinito-booking`.
3. Enable API: Google Calendar API.
4. OAuth consent screen: external ili internal, dodaj app name „Škola matematike Infinito”.
5. Credentials → Create OAuth client ID → Web application.
6. Dodaj redirect URL za backend.
7. Sačuvaj Client ID, Client Secret i Refresh Token u environment variables.
8. U `CalendarService` zameniti fallback kod pravim pozivom:
   - `events().insert("primary", event)`
   - `setConferenceDataVersion(1)`
   - `ConferenceDataCreateRequest` za Google Meet link.

## 4. Email slanje

Za email potvrde koristi se Spring Mail.

Na hostingu treba podesiti environment variables:

```text
MAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=avucicevic2002@gmail.com
SMTP_PASSWORD=GMAIL_APP_PASSWORD
OWNER_EMAIL=avucicevic2002@gmail.com
```

Za Gmail treba napraviti App Password, ne koristiti običnu lozinku.

## 5. Deployment opcija

Najlakše:

- Backend: Render
- Baza: Render PostgreSQL ili Neon
- Frontend: Vercel

### Backend na Render

1. Gurni projekat na GitHub.
2. Render → New Web Service.
3. Izaberi backend folder ili repo.
4. Environment: Docker.
5. Dodaj environment variables:

```text
FRONTEND_URL=https://tvoj-sajt.vercel.app
OWNER_EMAIL=avucicevic2002@gmail.com
MAIL_ENABLED=false
CALENDAR_ENABLED=false
```

Za bazu dodaj PostgreSQL i podesi:

```text
DATABASE_URL=jdbc:postgresql://HOST:PORT/DB_NAME
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
DATABASE_DRIVER=org.postgresql.Driver
```

### Frontend na Vercel

1. Vercel → Add New Project.
2. Izaberi `frontend` folder.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Environment variable:

```text
VITE_API_URL=https://tvoj-backend.onrender.com
```

## 6. Logo

Kada pošalješ logo, ubaci se u:

```text
frontend/src/assets/logo.png
```

Zatim u `main.jsx` zamenimo znak `∞` slikom.
