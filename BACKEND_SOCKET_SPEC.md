# Backend Implementation Spec — Socket.IO + REST

**Stack:** Node.js 20 · Express 4 · Socket.IO 4 · MongoDB (Mongoose 8) · JWT  
**Base URL:** `http://localhost:3000`  
**Socket Namespace:** `/chat`  
**Frontend connects to this same server (Angular app at port 4200)**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Setup](#2-project-setup)
3. [Folder Structure](#3-folder-structure)
4. [Environment Variables](#4-environment-variables)
5. [REST API Endpoints](#5-rest-api-endpoints)
6. [Socket.IO Event List](#6-socketio-event-list)
7. [MongoDB Schemas](#7-mongodb-schemas)
8. [Server Bootstrap — index.ts](#8-server-bootstrap--indexts)
9. [Socket Gateway — chat.gateway.ts](#9-socket-gateway--chatgatewayts)
10. [Auth Middleware](#10-auth-middleware)
11. [File Upload Setup](#11-file-upload-setup)
12. [Key Notes & Gotchas](#12-key-notes--gotchas)

---

## 1. Architecture Overview

```
Angular Client (port 4200)
        │
        ├── HTTP REST (Bearer JWT)  ──►  Express Routes  ──►  Mongoose  ──►  MongoDB
        │
        └── Socket.IO (/chat ns)   ──►  chat.gateway.ts ──►  Room broadcast
                                                          └──►  Persist to Message collection
```

### Room Strategy

Each customer conversation maps to one Socket.IO room:

```
Room name:  doc-room-{customerId}
```

- Admin joins `doc-room-{customerId}` to chat with a specific customer.
- Client joins the same `doc-room-{customerId}` on their side.
- Admin can also call `adminJoinAllRooms` to subscribe to all active rooms for global notifications.

---

## 2. Project Setup

```bash
mkdir insurance-backend && cd insurance-backend
npm init -y

# Production dependencies
npm install express socket.io mongoose jsonwebtoken bcryptjs multer cors dotenv

# Dev dependencies
npm install -D typescript @types/node @types/express ts-node nodemon
```

**Start command:**
```bash
npx ts-node src/index.ts
# or with nodemon
npx nodemon --exec ts-node src/index.ts
```

---

## 3. Folder Structure

```
insurance-backend/
├── src/
│   ├── index.ts                    ← Express + Socket.IO server bootstrap
│   ├── config/
│   │   └── db.ts                   ← Mongoose connect
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── customer.model.ts
│   │   ├── document.model.ts
│   │   └── message.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── customer.routes.ts
│   │   ├── document.routes.ts
│   │   └── message.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── document.controller.ts
│   │   └── message.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       ← JWT guard for REST routes
│   │   └── upload.middleware.ts     ← Multer config
│   └── socket/
│       └── chat.gateway.ts          ← /chat namespace + all socket events
├── upload/                          ← Uploaded files stored here
├── .env
├── tsconfig.json
└── package.json
```

---

## 4. Environment Variables

**.env**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/insurance_db
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
```

---

## 5. REST API Endpoints

All routes require `Authorization: Bearer <token>` **except** the Public ones listed below.

### Auth — `/auth`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/auth/create` | Register new user/client | Public |
| `POST` | `/auth/login` | Login — returns `access_token` | Public |
| `POST` | `/auth/reset-password` | Send password reset email | Public |
| `GET` | `/auth` | List all users (admin) | Required |
| `GET` | `/auth/:id` | Get user by ID | Required |
| `PATCH` | `/auth/:id` | Update user | Required |
| `DELETE` | `/auth/:id` | Delete user | Required |

**POST /auth/login — Request:**
```json
{ "mobile": "9876543210", "password": "secret123" }
```

**POST /auth/login — Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "role": "admin",
    "isLoggedIn": true
  },
  "access_token": "<JWT>"
}
```

---

### Customer — `/customer`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/customer` | List all customers | Required |
| `GET` | `/customer/:id` | Get customer by ID | Required |
| `GET` | `/customer/mobile/:mobile` | Lookup customer by mobile | Required |
| `GET` | `/customer/paged/:page/:limit` | Paginated list | Required |
| `POST` | `/customer` | Create customer | Required |
| `PATCH` | `/customer/:id` | Update customer | Required |
| `DELETE` | `/customer/:id` | Delete customer | Required |

**GET /customer/paged/:page/:limit — Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | String | Matches name / email / mobile |
| `sortBy` | String | Field to sort on (e.g. `createdAt`) |
| `sortDir` | `asc` \| `desc` | Sort direction |

---

### Documents — `/document-detail`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/document-detail/customer/:customerId` | Get all docs for a customer | Required |
| `POST` | `/document-detail` | Upload document (`multipart/form-data`) | Required |
| `PUT` | `/document-detail/:documentId/status` | Update document status | Required |
| `DELETE` | `/document-detail/:documentId` | Delete document | Required |

**POST /document-detail — Form Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `file` | File | Binary upload (Multer handles) |
| `customerId` | String | Customer ObjectId |
| `docTitle` | String | Document title |
| `docDescription` | String | Optional |
| `status` | String | `'submitted'` \| `'pending'` \| `'reviewed'` |
| `fileType` | String | MIME type |
| `fileSize` | Number | Bytes |
| `senderId` | String | Uploader user `_id` |
| `senderName` | String | Display name |

---

### Messages — `/message`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/message/history/:customerId` | Fetch chat history (HTTP fallback) | Required |
| `POST` | `/message` | Post message (HTTP fallback) | Required |

> **Note:** The frontend uses HTTP `POST /message` as the primary send path. The socket `sendMessage` event also works and persists to the same collection. Both paths broadcast `receiveMessage` to the room.

---

## 6. Socket.IO Event List

**Namespace:** `/chat`  
**Room format:** `doc-room-{customerId}`

---

### Client → Server Events

| Event | Payload | Server Action |
|-------|---------|---------------|
| `joinDocumentRoom` | `{ customerId, userId, userName }` | Join room, emit `messageHistory` back to socket |
| `sendMessage` | `{ customerId, message }` | Persist to Message collection, broadcast `receiveMessage` to room |
| `typing` | `{ customerId, isTyping }` | Broadcast `userTyping` to room (excluding sender) |
| `leaveRoom` | `{ customerId }` | Remove socket from room |
| `markRead` | `{ customerId, readerId }` | Mark all unread messages read, broadcast `messagesRead` |
| `documentStatusUpdate` | `{ customerId, documentId, status, updatedBy }` | Broadcast `documentStatusChanged` to room |
| `adminJoinAllRooms` | `{ adminId }` | Admin subscribes to all active customer rooms |
| `newDocumentUploaded` | `{ customerId, document }` | Notify admin room of new document arrival |

---

### Server → Client Events

| Event | Payload | When Delivered |
|-------|---------|----------------|
| `receiveMessage` | `ChatMessage` (full object with `_id`) | Broadcast to entire room after message persisted |
| `messageHistory` | `ChatMessage[]` | Emitted only to the joining socket |
| `userTyping` | `{ senderId, senderName, isTyping }` | Broadcast to room, excluding sender |
| `messagesRead` | `{ customerId, readerId, readAt }` | Broadcast when messages marked read |
| `documentStatusChanged` | `{ documentId, status, updatedBy, updatedAt }` | Broadcast so client sees live status update |
| `documentUploaded` | `DocumentPayload` | Sent to admin subscribers on new upload |
| `roomJoined` | `{ customerId, onlineUsers[] }` | Emitted to joining socket only |
| `userOnlineStatus` | `{ userId, online }` | Broadcast on connect/disconnect |
| `connect_error` | `Error` | Emitted on auth/network failure |

---

## 7. MongoDB Schemas

### User — collection: `users`

```typescript
const UserSchema = new mongoose.Schema({
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  mobile:     { type: String, required: true, unique: true },  // used for login
  password:   { type: String, required: true },                // bcrypt hashed
  role:       { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt:  { type: Date, default: Date.now },
});
```

### Customer — collection: `customers`

```typescript
const CustomerSchema = new mongoose.Schema({
  name:       { type: String },
  firstName:  { type: String },
  lastName:   { type: String },
  email:      { type: String, unique: true },
  mobile:     { type: String, unique: true },
  company:    { type: String },
  country:    { type: String },
  status:     { type: String, default: 'active' },
  createdAt:  { type: Date, default: Date.now },
});
```

### DocumentDetail — collection: `documentdetails`

```typescript
const DocumentDetailSchema = new mongoose.Schema({
  customerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  docTitle:        { type: String, required: true },
  docDescription:  { type: String },
  status:          { type: String, enum: ['submitted', 'pending', 'reviewed'], default: 'submitted' },
  filePath:        { type: String },    // e.g. "upload/filename.pdf"
  fileType:        { type: String },
  fileSize:        { type: Number },
  senderId:        { type: String },
  senderName:      { type: String },
  createdAt:       { type: Date, default: Date.now },
});
```

### Message — collection: `messages`

> **Critical:** The field name is `messages` (plural) — the frontend `ChatMessage` interface uses this exact name. Do not rename it.

```typescript
const MessageSchema = new mongoose.Schema({
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  senderId:    { type: String, required: true },
  senderName:  { type: String },
  messages:    { type: String, required: true },  // ← plural, matches frontend interface
  status:      { type: Boolean, default: false }, // false = unread, true = read
  createdAt:   { type: Date, default: Date.now },
});
```

---

## 8. Server Bootstrap — index.ts

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { registerChatGateway } from './socket/chat.gateway';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import documentRoutes from './routes/document.routes';
import messageRoutes from './routes/message.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// Serve uploaded files — frontend fetches at http://localhost:3000/upload/<filename>
app.use('/upload', express.static(path.join(__dirname, '../upload')));

app.use('/auth', authRoutes);
app.use('/customer', customerRoutes);
app.use('/document-detail', documentRoutes);
app.use('/message', messageRoutes);

registerChatGateway(io);

connectDB().then(() => {
  httpServer.listen(process.env.PORT ?? 3000, () =>
    console.log(`Server running on port ${process.env.PORT ?? 3000}`)
  );
});
```

---

## 9. Socket Gateway — chat.gateway.ts

```typescript
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/message.model';

const room = (customerId: string) => `doc-room-${customerId}`;

export function registerChatGateway(io: Server) {
  const chat = io.of('/chat');

  // JWT auth on every connection
  chat.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.user = decoded; // { id, role, name }
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chat.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Join room + send history
    socket.on('joinDocumentRoom', async ({ customerId, userId, userName }) => {
      socket.join(room(customerId));
      const history = await Message.find({ customerId }).sort({ createdAt: 1 });
      socket.emit('messageHistory', history);
      socket.emit('roomJoined', { customerId });
    });

    // Send message via socket (alternative to HTTP POST /message)
    socket.on('sendMessage', async ({ customerId, message }) => {
      const msg = await Message.create({
        customerId,
        senderId: socket.data.user?.id ?? 'unknown',
        senderName: socket.data.user?.name,
        messages: message,
        status: false,
      });
      chat.to(room(customerId)).emit('receiveMessage', msg);
    });

    // Typing indicator
    socket.on('typing', ({ customerId, isTyping }) => {
      socket.to(room(customerId)).emit('userTyping', {
        senderId: socket.data.user?.id,
        senderName: socket.data.user?.name,
        isTyping,
      });
    });

    // Mark messages as read
    socket.on('markRead', async ({ customerId, readerId }) => {
      await Message.updateMany({ customerId, status: false }, { status: true });
      socket.to(room(customerId)).emit('messagesRead', {
        customerId,
        readerId,
        readAt: new Date(),
      });
    });

    // Document status changed by admin
    socket.on('documentStatusUpdate', ({ customerId, documentId, status, updatedBy }) => {
      chat.to(room(customerId)).emit('documentStatusChanged', {
        documentId,
        status,
        updatedBy,
        updatedAt: new Date(),
      });
    });

    // New document uploaded by client
    socket.on('newDocumentUploaded', ({ customerId, document }) => {
      socket.to(room(customerId)).emit('documentUploaded', document);
    });

    // Admin joins all active rooms
    socket.on('adminJoinAllRooms', async ({ adminId }) => {
      const customers = await Message.distinct('customerId');
      customers.forEach((id) => socket.join(room(String(id))));
    });

    // Leave room
    socket.on('leaveRoom', ({ customerId }) => {
      socket.leave(room(customerId));
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}
```

---

## 10. Auth Middleware

**middleware/auth.middleware.ts** — protects REST routes

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
```

Apply to protected routes:
```typescript
import { authMiddleware } from '../middleware/auth.middleware';

router.get('/', authMiddleware, getAllCustomers);
router.get('/:id', authMiddleware, getCustomerById);
```

---

## 11. File Upload Setup

**middleware/upload.middleware.ts**

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../../upload');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({ storage });
```

Use in document route:
```typescript
import { upload } from '../middleware/upload.middleware';

router.post('/', authMiddleware, upload.single('file'), createDocument);
```

Store `filePath` in DB as `upload/<filename>` so frontend can fetch it at `http://localhost:3000/upload/<filename>`.

---

## 12. Key Notes & Gotchas

| # | Note |
|---|------|
| 1 | **`messages` field is plural** — the frontend `ChatMessage` interface uses `messages` not `message`. Mismatch here breaks all chat rendering. |
| 2 | **HTTP POST /message also broadcasts** — when a message is saved via the REST endpoint, emit `receiveMessage` to the socket room inside the controller too (or the admin won't see it in real time). |
| 3 | **`filePath` must be relative** — store as `upload/filename.pdf`, not an absolute path. Frontend constructs the full URL with `API_BASE_URL`. |
| 4 | **CORS** — set `origin: '*'` (or `http://localhost:4200`) in Socket.IO server config and Express `cors()`. |
| 5 | **Login response shape** — return both `data` (with `id`, `role`, `isLoggedIn`) and `access_token` at the root level. The Angular `AccountStateService` reads both paths. |
| 6 | **Token key** — the frontend stores the token under key `session-token` in `localStorage` and sends it as `Authorization: Bearer <token>`. |
| 7 | **Socket auth token** — the frontend's `ChatService` does not pass auth token in `socket.handshake.auth` yet. If you enforce socket auth, either add the token on the frontend side or make socket auth optional for now. |
| 8 | **Polling fallback** — the frontend polls `GET /message/history/:customerId` every 3 seconds as a safety net alongside socket events. Make sure this endpoint is fast (indexed on `customerId`). |

---

*Generated from codebase analysis of `insurance-app` (Angular 18) — Base URL: `http://localhost:3000`*
