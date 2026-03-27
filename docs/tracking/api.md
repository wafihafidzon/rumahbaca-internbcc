# API: Tracking

All endpoints require `JwtAuthGuard + AclGuard` unless noted.

---

## Books

### `POST /books`
Tambah buku manual. Jika kombinasi `title + author` (normalized) sudah ada, kembalikan buku existing.

**Permission:** `book:create`

**Request body:**
```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "totalPages": 320,
  "coverUrl": "https://..." // optional
}
```

**Response `201`:**
```json
{
  "id": "cuid",
  "title": "Atomic Habits",
  "author": "James Clear",
  "totalPages": 320,
  "coverUrl": null,
  "createdByUserId": "cuid"
}
```

---

### `GET /books/search`
Cari buku berdasarkan title atau author.

**Permission:** `book:read`

**Query params:** `q` (string, required), `page`, `limit`

**Response `200`:**
```json
{
  "data": [{ "id", "title", "author", "totalPages", "coverUrl" }],
  "meta": { "total", "page", "limit" }
}
```

---

## Reading Trackers

### `POST /readings`
Buat tracker baru untuk buku tertentu.

**Permission:** `reading:create`

**Request body:**
```json
{
  "bookId": "cuid",
  "targetEndDate": "2026-04-30", // optional
  "dailyPageGoal": 20             // optional
}
```

**Response `201`:** tracker object dengan `currentPage = 0`, `status = ACTIVE`

---

### `GET /readings`
List semua tracker milik current user.

**Permission:** `reading:read`

**Query params:** `status` (ACTIVE | COMPLETED | PAUSED), `page`, `limit`

**Response `200`:** paginated list of tracker objects

---

### `GET /readings/:id`
Detail satu tracker beserta info buku.

**Permission:** `reading:read`

**Response `200`:** tracker + book detail + goal summary

---

### `PATCH /readings/:id`
Update `status`, `targetEndDate`, atau `dailyPageGoal`.

**Permission:** `reading:update`

**Request body:** (semua opsional)
```json
{
  "status": "PAUSED",
  "targetEndDate": "2026-05-15",
  "dailyPageGoal": 15
}
```

---

## Reading Sessions

### `POST /readings/:id/sessions`
Catat sesi baca baru pada tracker `:id`.

**Permission:** `reading:create`

**Request body:**
```json
{
  "startPage": 50,
  "endPage": 75,
  "durationMinutes": 45, // optional
  "insight": "...",       // optional
  "photoUrl": "..."       // optional
}
```

**Response `201`:** session object; jika `endPage == totalPages`, tracker status di-set `COMPLETED`

---

### `GET /readings/:id/sessions`
List histori sesi pada tracker `:id`.

**Permission:** `reading:read`

**Query params:** `page`, `limit`

**Response `200`:** paginated list of session objects

---

## Dashboard & Streak

### `GET /reading-dashboard/me`
Ringkasan aktivitas membaca current user.

**Permission:** `reading:read`

**Response `200`:**
```json
{
  "currentStreak": 5,
  "streakStatus": "active",
  "freezeLeft": 1,
  "pagesReadToday": 30,
  "pagesReadLast7Days": 150,
  "activeReadings": [
    {
      "trackerId": "cuid",
      "bookTitle": "Atomic Habits",
      "currentPage": 75,
      "totalPages": 320,
      "goalSummary": { "status": "on_track", "pagesNeededPerDay": 18 }
    }
  ],
  "completedBooksCount": 3
}
```

---

### `GET /reading-streak/me`
State streak terkini beserta kalender 7 hari terakhir.

**Permission:** `reading:read`

**Response `200`:**
```json
{
  "currentCount": 5,
  "status": "active",
  "availableFreezes": 1,
  "lastActiveDate": "2026-03-25",
  "streakCalendar": [
    { "date": "2026-03-20", "status": "read" },
    { "date": "2026-03-21", "status": "read" },
    { "date": "2026-03-22", "status": "freeze" },
    { "date": "2026-03-23", "status": "read" }
  ]
}
```

---

### `GET /reading-streak/me/calendar`
Kalender streak dengan rentang waktu yang bisa dikonfigurasi.

**Permission:** `reading:read`

**Query params:** `range` (7 | 30, default: 7)

**Response `200`:**
```json
{
  "days": [
    { "date": "2026-03-01", "status": "read", "pagesRead": 25 },
    { "date": "2026-03-02", "status": "miss", "pagesRead": 0 }
  ]
}
```
