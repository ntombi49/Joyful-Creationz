# Joyful Creationz

A simple event management app with registration, admin controls, and CSV export.

## What was added

- Frontend registration form with validation
- Admin login to add, edit, and delete events
- Registration management with remove option
- CSV export for registrations
- Friendly messages and polished UI
- Backend validation and error handling
- Static frontend served from the backend for easier local deployment

## Run locally

1. Install dependencies:

```bash
cd backend
npm install
```

2. Start the backend and frontend together:

```bash
npm start
```

3. Open the app in your browser:

```text
http://localhost:3000
```

## Admin access

- Click the **Admin Panel** button
- Enter the password: `joyful123`

## Deploy locally on your network

If you want to test from another device on the same network, open the browser on that device and visit:

```text
http://<your-machine-ip>:3000
```

Make sure your computer's firewall allows incoming traffic on port `3000`.

## API

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/orders`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`
- `GET /api/users`
- `POST /api/users`
- `GET /api/partners`
- `POST /api/partners`
- `PUT /api/partners/:id`
- `DELETE /api/partners/:id`
- `GET /api/registrations`
- `POST /api/registrations`
- `PUT /api/registrations/:id`
- `DELETE /api/registrations/:id`
- `GET /api/registrations/export`
- `GET /api/tickets`
- `POST /api/tickets/send/:registrationId`
- `POST /api/tickets/resend/:ticketId`
- `POST /api/uploads`

## Notes

- All event and registration validations happen on both frontend and backend.
- CSV exports are generated from the backend at `/registrations/export`.
