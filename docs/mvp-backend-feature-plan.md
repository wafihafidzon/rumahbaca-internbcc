# Plan MVP Backend RumahBaca

## Summary
Backend MVP akan difokuskan ke 3 epic utama: `Tracking`, `Add Friends`, dan `Read with Friends`. Fondasinya tetap memakai stack repo sekarang: NestJS, Prisma, PostgreSQL, JWT auth, pola `controller -> service -> repository`, serta ACL/permission yang sudah ada.

Keputusan scope yang sudah terkunci:
- buku untuk MVP masih `manual input`
- progress utama berbasis `pages`
- tracking mendukung `goal` dan `dashboard summary`
- streak dihitung lintas buku, level user, bukan per buku
- room memakai `single source of truth` dari progress personal user
- room discussion untuk MVP adalah `flat comments + likes`
- flow room adalah `host invite friend -> invitee accept/reject`

## Implementation Changes
### 1. Tracking
- Tambah `Book` untuk buku manual.
  Field minimum: `id`, `title`, `author`, `totalPages`, `coverUrl?`, `createdByUserId`, timestamps.
- Tambah `ReadingTracker` untuk progres utama user per buku.
  Field minimum: `userId`, `bookId`, `currentPage`, `status(active|completed|paused)`, `startedAt`, `completedAt?`, `targetEndDate?`, `dailyPageGoal?`.
- Tambah `ReadingSession` untuk histori update progres.
  Field minimum: `readingTrackerId`, `trackedAt`, `startPage`, `endPage`, `durationMinutes?`, `insight?`, `photoUrl?`, `roomId?`.
- Rule utama tracking:
  - satu user hanya punya satu tracker aktif per buku
  - session tidak boleh menurunkan `currentPage`
  - minimal progres valid untuk activity adalah `1 halaman`
  - jika `endPage == totalPages`, tracker otomatis `completed`
  - tracking tidak boleh `backdate`

### 2. Streak
- Streak bersifat global per user, lintas buku.
- Tambah `UserReadingStreak` untuk state saat ini.
  Field minimum: `userId`, `currentCount`, `status(inactive|active|frozen)`, `availableFreezes`, `lastActiveDate`, `lastCountedDate`, `consecutivePreStreakDays`.
- Tambah `UserReadingStreakDay` untuk ledger harian.
  Field minimum: `userId`, `date`, `status(read|freeze|miss|reset)`, `pagesRead`, `sourceSessionCount`.
- Rule streak yang sudah direvisi:
  - aktivitas valid: user membaca buku apa pun minimal `1 halaman` pada hari itu
  - boundary hari memakai `Asia/Jakarta`
  - satu hari hanya dihitung sekali untuk streak, walau ada banyak session/buku
  - streak baru aktif jika user membaca `2 hari berturut-turut`
  - saat streak aktif pertama kali, counter yang tampil adalah `2`
  - freeze hanya berlaku setelah streak sudah aktif
  - freeze dipakai `otomatis` saat user miss sehari dan stok freeze masih ada
  - hari freeze hanya menjaga streak tetap hidup, tidak menambah angka streak
  - stok freeze maksimal `2` per siklus streak
  - freeze tidak refill di tengah siklus
  - setelah freeze habis, miss berikutnya langsung `reset`
  - setelah reset, cycle kembali dari awal dan stok freeze kembali `2`
- Recalculation:
  - jika session diubah atau dihapus, backend harus recalculate ledger dan state streak untuk hari yang terdampak

### 3. Dashboard dan Goal
- Goal MVP mendukung:
  - `targetEndDate`
  - `dailyPageGoal`
- Dashboard tracking minimal mengembalikan:
  - `currentStreak`
  - `streakStatus`
  - `freezeLeft`
  - `streakCalendar` 7 atau 30 hari terakhir
  - `pagesReadToday`
  - `pagesReadLast7Days`
  - `activeReadings`
  - `completedBooksCount`
  - `goalSummary` per tracker aktif

### 4. Add Friends
- Tambah `FriendRequest`.
  Status: `pending`, `accepted`, `rejected`, `cancelled`.
- Tambah `Friendship` untuk koneksi mutual yang sudah accepted.
  Simpan pasangan user terkanonisasi agar unik.
- Rule utama:
  - user search berdasarkan nama/username
  - tidak bisa add diri sendiri
  - tidak bisa kirim request jika sudah berteman
  - tidak bisa ada pending request dua arah untuk pasangan user yang sama
  - accept membuat `Friendship`
  - reject hanya menutup request
  - unfriend menghapus koneksi aktif, bukan histori request

### 5. Read with Friends
- Tambah `ReadingRoom`, `RoomInvite`, `RoomMember`, `RoomComment`, `RoomCommentLike`.
- `ReadingRoom` minimum field:
  - `hostId`, `bookId`, `title`, `description?`, `startDate`, `endDate`, `status`
- `RoomInvite`:
  - invite hanya untuk user yang sudah berteman dengan host
  - status `pending`, `accepted`, `rejected`
- `RoomMember`:
  - terbentuk setelah invite accepted
  - jika user belum punya tracker untuk buku room, backend auto-create tracker dengan `currentPage = 0`
- `RoomComment`:
  - flat comment only
- `RoomCommentLike`:
  - unik per `commentId-userId`
- Rule utama:
  - room progress tidak punya sumber data terpisah
  - `POST /rooms/:id/progress` membuat `ReadingSession` dengan `roomId`
  - detail room membaca progress member dari `ReadingTracker.currentPage`
  - hanya member yang bisa lihat room, comment, dan progress room
  - hanya host yang bisa mengundang

## Public Interfaces
- `POST /books`
- `GET /books/search`
- `POST /readings`
- `GET /readings`
- `GET /readings/:id`
- `PATCH /readings/:id`
- `POST /readings/:id/sessions`
- `GET /readings/:id/sessions`
- `GET /reading-dashboard/me`
- `GET /reading-streak/me`
- `GET /reading-streak/me/calendar`
- `GET /users/search`
- `POST /friend-requests`
- `GET /friend-requests`
- `PATCH /friend-requests/:id/respond`
- `GET /friends`
- `DELETE /friends/:friendId`
- `POST /rooms`
- `GET /rooms`
- `GET /rooms/:id`
- `POST /rooms/:id/invites`
- `GET /room-invites`
- `PATCH /room-invites/:id/respond`
- `POST /rooms/:id/progress`
- `GET /rooms/:id/comments`
- `POST /rooms/:id/comments`
- `POST /rooms/comments/:id/likes`
- `DELETE /rooms/comments/:id/likes`

## Repo Changes
- Tambah Prisma models:
  - `Book`
  - `ReadingTracker`
  - `ReadingSession`
  - `UserReadingStreak`
  - `UserReadingStreakDay`
  - `FriendRequest`
  - `Friendship`
  - `ReadingRoom`
  - `RoomInvite`
  - `RoomMember`
  - `RoomComment`
  - `RoomCommentLike`
- Tambah Nest modules baru:
  - `book`
  - `reading`
  - `friendship`
  - `room`
- Tambah ACL permission constants dan seed data untuk domain baru.
- Tetap pakai auth, user, Prisma, logger, cache, dan pola repo saat ini.

## Test Plan
- Tracking:
  - create tracker dari buku manual
  - session valid menaikkan current page
  - progress tidak boleh mundur
  - auto-complete saat page akhir tercapai
  - goal summary benar untuk `targetEndDate` dan `dailyPageGoal`
- Streak:
  - dua hari baca berturut-turut mengaktifkan streak dengan count `2`
  - miss sebelum streak aktif tidak mengonsumsi freeze
  - miss saat streak aktif mengonsumsi freeze otomatis jika tersedia
  - hari freeze tidak menaikkan counter
  - setelah 2 freeze habis, miss berikutnya me-reset streak
  - reset mengembalikan freeze menjadi `2`
  - banyak session dalam satu hari tetap dihitung satu hari
  - session dari buku berbeda pada hari yang sama tetap dihitung satu hari
  - edit/delete session memicu recalculation yang benar
- Add Friends:
  - search user mengembalikan relationship status
  - duplicate request dua arah ditolak
  - accept membuat friendship unik
  - unfriend menghapus koneksi aktif
- Read with Friends:
  - host hanya bisa invite teman
  - accept invite menambah member dan tracker bila belum ada
  - update room progress memakai tracker personal yang sama
  - non-member tidak bisa akses detail room
  - comment create/list berjalan
  - like komentar hanya satu kali per user
- E2E utama:
  - tracking flow end-to-end
  - friend request flow end-to-end
  - create room -> invite -> accept -> update progress -> comment -> like

## Assumptions
- Scope MVP belum mencakup external book API, room discovery, direct chat, threaded reply, privacy control, social share, reminder notification, atau leaderboard.
- Buku manual didedup dengan exact-normalized `title + author`; fuzzy matching belum masuk MVP.
- Dashboard dan streak memakai timezone default `Asia/Jakarta`, belum per-user timezone.
- Jika nanti plan ini ditulis ke `mvp-backend-feature-plan.md`, struktur utamanya akan tetap mengikuti 3 epic supaya mudah dipakai untuk breakdown Trello dan review lintas tim.
