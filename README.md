# MindVault — Digital Clutter Organizer

A full-stack team project built with React, Node.js, Express and MongoDB.

## Included features

- JWT registration and login
- Personal dashboard with resource statistics
- Save website links, text notes and uploaded files
- Upload PDF, DOC/DOCX, TXT, PNG, JPG/JPEG and WEBP files (10 MB max)
- Edit and delete resources
- Categories and comma-separated tags
- Search by title, description, content and tags
- Filter by type and category; sort by newest/oldest/title
- Favorites, pinned items, archive and recycle bin
- Restore items from the recycle bin
- Collections (create collections and assign resources)
- Recently viewed resources
- Responsive layout with Light, Dark and System theme preferences
- Account settings with logout and authenticated password changes
- Registration and password-change validation: 9+ characters, uppercase, lowercase, number and special character
- Live Weak / Medium / Strong password feedback and confirm-password checks
- MongoDB Atlas connection via the server-only `MONGO_URI` environment variable (local MongoDB remains supported)
- Per-user data isolation on API routes

## Requirements

- Node.js 20+
- npm 10+
- MongoDB Atlas account (recommended) or MongoDB 7+ locally

## Connect MongoDB Atlas

1. Create a free cluster in [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2. Create a database user under **Database Access**. Use a strong password.
3. Under **Network Access**, add the IP address of the machine/server that will run the backend. Avoid `0.0.0.0/0` for production unless you understand the exposure.
4. In the cluster, choose **Connect → Drivers → Node.js** and copy the connection string.
5. Create `server/.env` from `server/.env.example` and replace `<username>`, `<password>` and `<cluster-host>` in `MONGO_URI`. URL-encode special characters in the database password.
6. Keep `MONGO_URI` only in `server/.env`. Never put it in a `VITE_` variable or commit it to Git.

Example format (not a working credential):

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/mindvault?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret-at-least-32-characters>
CLIENT_ORIGIN=http://localhost:5173
```

For local MongoDB instead, set `MONGO_URI=mongodb://127.0.0.1:27017/mindvault` and optionally start Docker:

```bash
docker compose up -d mongodb
```

## Run locally

1. Install dependencies from the project root:
   ```bash
   npm install
   ```
2. Create `server/.env` from `server/.env.example` and fill in your Atlas URI and JWT secret:
   ```bash
   cp server/.env.example server/.env
   ```
3. Start frontend and backend:
   ```bash
   npm run dev
   ```
4. Open:
   - Frontend: http://localhost:5173
   - API health: http://localhost:5000/api/health

The Vite dev server proxies `/api` and `/uploads` to Express.

## Production build

```bash
npm run build
npm start
```

Set `CLIENT_ORIGIN` in `server/.env` to the deployed frontend origin. The Express server serves the built client from `client/dist` when it exists.

## Team project division (suggested)

- Member 1 — React UI, responsive layout, theme
- Member 2 — Express APIs, JWT authentication, validation
- Member 3 — MongoDB models, resource and collection workflows
- Member 4 — file uploads, testing, integration and deployment

For a smaller team, combine responsibilities.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password` (requires current password and a valid new password)
- `GET/POST /api/resources`
- `GET/PATCH/DELETE /api/resources/:id`
- `PATCH /api/resources/:id/restore`
- `GET/POST /api/collections`
- `PATCH/DELETE /api/collections/:id`
- `GET /api/dashboard`
- `GET /api/health`

All resource, collection and password-change endpoints require `Authorization: Bearer <token>`. Passwords are hashed with bcrypt; the API enforces the password policy even if frontend validation is bypassed.

## Notes

- Uploaded files are stored in `server/uploads` for local development. For deployment, use object storage (Cloudinary, S3, or Firebase Storage) and configure access controls.
- This starter uses simple text search with MongoDB regex. Semantic search and AI summarization are intentionally left as future extensions requiring an API key and careful privacy controls.
- Do not commit `.env` or real user uploads to GitHub.
