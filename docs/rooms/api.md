# API: Read with Friends

All endpoints require `JwtAuthGuard + AclGuard`. Member-only access is enforced at the service layer.

---

## Rooms

### `POST /rooms`
Buat reading room baru. Host otomatis jadi member pertama.

**Permission:** `room:create`

**Request body:**
```json
{
  "bookId": "cuid",
  "title": "Baca Atomic Habits Bareng",
  "description": "Target selesai dalam 30 hari", // optional
  "startDate": "2026-04-01",
  "endDate": "2026-04-30"
}
```

**Response `201`:** room object dengan `status: ACTIVE`

---

### `GET /rooms`
List room yang diikuti oleh current user (sebagai host atau member).

**Permission:** `room:read`

**Query params:** `status` (ACTIVE | COMPLETED | CANCELLED), `page`, `limit`

**Response `200`:** paginated list of room summaries

---

### `GET /rooms/:id`
Detail room termasuk daftar member dan progres masing-masing.

**Permission:** `room:read` (member only)

**Response `200`:**
```json
{
  "id": "cuid",
  "title": "Baca Atomic Habits Bareng",
  "book": { "id", "title", "author", "totalPages" },
  "host": { "id", "username", "name" },
  "status": "ACTIVE",
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "members": [
    {
      "userId": "cuid",
      "username": "alice",
      "currentPage": 75,
      "totalPages": 320
    }
  ]
}
```

**Errors:**
- `403` — current user bukan member room

---

## Room Invites

### `POST /rooms/:id/invites`
Host mengundang teman ke room.

**Permission:** `room:invite`

**Request body:**
```json
{
  "inviteeId": "cuid"
}
```

**Response `201`:** invite object dengan `status: PENDING`

**Errors:**
- `400` — invitee bukan teman host
- `403` — current user bukan host
- `409` — sudah punya invite pending atau sudah jadi member

---

### `GET /room-invites`
List undangan room yang diterima current user (status `PENDING`).

**Permission:** `room:read`

**Query params:** `page`, `limit`

**Response `200`:** paginated list of pending invites dengan room summary

---

### `PATCH /room-invites/:id/respond`
Terima atau tolak undangan room.

**Permission:** `room:update`

**Request body:**
```json
{
  "action": "accept" // accept | reject
}
```

**Response `200`:** updated invite object

**Errors:**
- `403` — bukan invitee
- `404` — invite tidak ditemukan
- `409` — invite sudah tidak `PENDING`

---

## Room Progress

### `POST /rooms/:id/progress`
Update progres membaca dari dalam room. Membuat ReadingSession dengan `roomId`.

**Permission:** `reading:create` (member only)

**Request body:**
```json
{
  "startPage": 50,
  "endPage": 75,
  "durationMinutes": 30, // optional
  "insight": "..."        // optional
}
```

**Response `201`:** session object dengan `roomId` terisi

**Errors:**
- `403` — current user bukan member room
- `400` — violasi aturan session (page regression, exceed totalPages, dll.)

---

## Room Comments

### `GET /rooms/:id/comments`
List komentar di room (flat, ordered by `createdAt` asc).

**Permission:** `room:read` (member only)

**Query params:** `page`, `limit`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cuid",
      "content": "Bagian freeze streak-nya menarik!",
      "author": { "id", "username", "avatarUrl" },
      "likesCount": 3,
      "likedByMe": true,
      "createdAt": "2026-03-26T10:00:00.000Z"
    }
  ],
  "meta": { "total", "page", "limit" }
}
```

---

### `POST /rooms/:id/comments`
Tambah komentar baru di room.

**Permission:** `room:comment` (member only)

**Request body:**
```json
{
  "content": "Bagian freeze streak-nya menarik!"
}
```

**Response `201`:** comment object

---

## Comment Likes

### `POST /rooms/comments/:id/likes`
Like komentar.

**Permission:** `room:comment` (member only)

**Response `201`:** like object

**Errors:**
- `409` — user sudah like komentar ini

---

### `DELETE /rooms/comments/:id/likes`
Unlike komentar.

**Permission:** `room:comment` (member only)

**Response `204`:** no content

**Errors:**
- `404` — user belum like komentar ini
