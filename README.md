# Full-Stack Notes Application

A complete, responsive, full-stack Notes Application built with Node.js, Express, SQLite, and modern JavaScript (ES6+ SPA).

## Features

- **Authentication System:**
  - Secure registration with email, password, and confirm password.
  - Secure login with email and password.
  - Passwords hashed using bcrypt (never stored as plain text).
  - Stateless JSON Web Tokens (JWT) for authentication and persistent sessions.
  - Automatic session recovery on page refresh.
  - Real-time client-side and server-side validation (empty fields, invalid emails, password mismatch, duplicate accounts).
  - One-click logout.

- **Notes Management:**
  - **Unlimited Notes:** Create and save unlimited notes permanently in SQLite database.
  - **No Artificial Character Limits:** Write short thoughts, complex markdown, full code snippets, or book-length documents with multi-line paragraph and keyboard shortcut support (`Ctrl+S` / `Cmd+S`).
  - **Two-Column Desktop Dashboard:**
    - **Left Column:** "+ New Note" button, live search input with quick-clear button, note counter, and scrollable note cards displaying title, content preview snippet, and relative timestamp (e.g., "Updated 2 minutes ago").
    - **Right Column:** Large title input, live word & character counter, save status badge, Save/Update button, Delete button, and full-screen editor.
  - **Instant Live Search:** Filter notes in real-time by title or content.
  - **Strict User Privacy & Multi-Tenancy:** Each user can only view, create, edit, and delete their own notes.
  - **Safe Deletion:** Modal confirmation dialog before permanent deletion.
  - **Instant UI Updates:** Notes list and editor update immediately without page reloads.
  - **Mobile Responsive:** Seamless responsive navigation between notes list and editor on phones and tablets.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (via Node's high-performance built-in `node:sqlite` `DatabaseSync`, WAL mode enabled)
- **Security:** `bcryptjs` for password hashing, `jsonwebtoken` for auth tokens, CORS, input sanitization
- **Frontend:** Vanilla JavaScript (ES6 Modules, single-page application architecture), modern responsive CSS with design variables, SVG icons, and Google Fonts (Plus Jakarta Sans & JetBrains Mono)
- **Testing:** Built-in test suite covering validation, authentication, CRUD operations, and multi-user privacy isolation.

---

## Project Structure

```
QuickApp/
├── .env                       # Local environment configuration
├── .env.example               # Environment template
├── package.json               # Node.js project manifest & scripts
├── README.md                  # Project documentation
├── server/
│   ├── index.js               # Express application entry point
│   ├── config.js              # Environment settings & paths
│   ├── db/
│   │   └── database.js        # SQLite connection, tables, indexes & WAL mode
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & user attachment middleware
│   │   └── errorHandler.js    # 404 and global error handlers
│   ├── controllers/
│   │   ├── authController.js  # Registration, login, profile & validation
│   │   └── notesController.js # Notes CRUD & user ownership validation
│   └── routes/
│       ├── authRoutes.js      # Authentication endpoints
│       └── notesRoutes.js     # Notes endpoints
├── public/
│   ├── index.html             # Single-page application markup
│   ├── css/
│   │   └── style.css          # Responsive design & modern theme
│   └── js/
│       ├── api.js             # Fetch wrapper & API client
│       ├── auth.js            # Auth state manager & session persistence
│       ├── notes.js           # Notes UI, editor, counters & search
│       └── app.js             # Application router & event orchestration
└── tests/
    └── test-controllers.js    # 15 automated test cases
```

---

## Getting Started

### 1. Installation

Ensure Node.js (v18+) is installed on your machine.
Install dependencies:

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` (already created by default):

```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
DB_FILE=data/notes.db
```

### 3. Run the Application

Start the server:

```bash
npm start
```

For development mode with automatic restarts:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## Running Automated Tests

Run the test suite verifying all 15 test cases (validation, authentication, note creation, retrieval, updates, user isolation, and deletion):

```bash
npm test
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user with email, password, confirmPassword | No |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |
| `POST` | `/api/auth/logout` | Client session logout | No |

### Notes
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notes` | List notes for authenticated user (supports `?search=`) | Yes (Bearer Token) |
| `POST` | `/api/notes` | Create a new note (title, content) | Yes (Bearer Token) |
| `GET` | `/api/notes/:id` | Get single note by ID (user-isolated) | Yes (Bearer Token) |
| `PUT` | `/api/notes/:id` | Update note title and content | Yes (Bearer Token) |
| `DELETE` | `/api/notes/:id` | Delete note permanently | Yes (Bearer Token) |
