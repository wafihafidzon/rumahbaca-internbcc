# API: Add Friends

All endpoints require `JwtAuthGuard + AclGuard`.

---

## Users

### `GET /users/search`
Cari user berdasarkan nama atau username. Hasil menyertakan relationship status.

**Permission:** `user:read`

**Query params:** `q` (string, required), `page`, `limit`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cuid",
      "username": "jamesClear",
      "name": "James Clear",
      "avatarUrl": null,
      "relationshipStatus": "none" // none | friends | request_sent | request_received
    }
  ],
  "meta": { "total", "page", "limit" }
}
```

---

## Friend Requests

### `POST /friend-requests`
Kirim friend request ke user lain.

**Permission:** `friend:create`

**Request body:**
```json
{
  "receiverId": "cuid"
}
```

**Response `201`:**
```json
{
  "id": "cuid",
  "senderId": "cuid",
  "receiverId": "cuid",
  "status": "PENDING",
  "createdAt": "2026-03-26T00:00:00.000Z"
}
```

**Errors:**
- `400` — kirim ke diri sendiri
- `409` — sudah berteman atau request sudah ada

---

### `GET /friend-requests`
List friend request yang diterima oleh current user (status `PENDING`).

**Permission:** `friend:read`

**Query params:** `type` (received | sent, default: received), `page`, `limit`

**Response `200`:** paginated list of request objects dengan sender/receiver summary

---

### `PATCH /friend-requests/:id/respond`
Terima atau tolak friend request.

**Permission:** `friend:update`

**Request body:**
```json
{
  "action": "accept" // accept | reject | cancel
}
```

**Response `200`:** updated request object

**Errors:**
- `403` — bukan receiver (untuk accept/reject) atau bukan sender (untuk cancel)
- `404` — request tidak ditemukan
- `409` — request sudah tidak `PENDING`

---

## Friendships

### `GET /friends`
List semua teman current user.

**Permission:** `friend:read`

**Query params:** `page`, `limit`

**Response `200`:**
```json
{
  "data": [
    {
      "friendId": "cuid",
      "username": "jamesClear",
      "name": "James Clear",
      "avatarUrl": null,
      "friendsSince": "2026-03-20T00:00:00.000Z"
    }
  ],
  "meta": { "total", "page", "limit" }
}
```

---

### `DELETE /friends/:friendId`
Hapus pertemanan dengan user `:friendId`.

**Permission:** `friend:delete`

**Response `204`:** no content

**Errors:**
- `404` — tidak ada Friendship aktif dengan user tersebut
