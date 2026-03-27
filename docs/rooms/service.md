# Service: Read with Friends

## Business Rules

### Create Room
- `hostId` = current user
- `bookId` harus valid (Book exists)
- Host otomatis menjadi `RoomMember` saat room dibuat
- Jika host belum punya `ReadingTracker` untuk buku ini, backend auto-create tracker dengan `currentPage = 0`

### Invite Member
- Hanya **host** yang bisa mengundang (`hostId == currentUser.id` → else 403)
- `inviteeId` harus ada dalam daftar Friendship host (cek `Friendship` aktif) → else 400
- Tidak bisa mengundang diri sendiri
- Tidak bisa mengundang user yang sudah jadi member
- Tidak bisa mengundang user yang sudah punya invite `PENDING` di room ini (`@@unique([roomId, inviteeId])`)
- Buat `RoomInvite` dengan status `PENDING`

### Respond to Invite
**Accept:**
- Pastikan `inviteeId == currentUser.id` → else 403
- Update `RoomInvite.status` ke `ACCEPTED`
- Buat `RoomMember`
- Jika user belum punya `ReadingTracker` untuk `room.bookId` → auto-create tracker dengan `currentPage = 0`
- Semua dalam satu **Prisma transaction**

**Reject:**
- Pastikan `inviteeId == currentUser.id` → else 403
- Update `RoomInvite.status` ke `REJECTED`
- Tidak ada aksi lain

### Update Progress (dari Room)
- `POST /rooms/:id/progress` hanya untuk member room → else 403
- Membuat `ReadingSession` untuk tracker user dengan `roomId` diisi
- Mengikuti semua aturan session tracking (tidak boleh mundur, minimal 1 halaman, dsb.)
- Progres ini sekaligus update `ReadingTracker.currentPage` user

### View Room Detail
- Hanya member room yang bisa akses detail, comments, dan progress room → else 403
- Progress semua member diambil dari `ReadingTracker.currentPage` masing-masing member

### Comments
- Hanya member yang bisa membuat, membaca komentar
- Flat only — tidak ada `parentCommentId`

### Comment Likes
- Hanya member yang bisa memberikan like
- Unik per `commentId-userId` (`@@unique([commentId, userId])`)
- Like: insert `RoomCommentLike`; jika sudah ada → 409
- Unlike: delete `RoomCommentLike`; jika tidak ada → 404

---

## Test Cases

- Host buat room → host otomatis jadi member, ReadingTracker auto-created jika belum ada
- Host undang teman → invite created dengan status PENDING
- Host undang bukan teman → 400
- Host undang user yang sudah member → 409
- Non-host mencoba undang → 403
- Accept invite → RoomMember terbentuk, ReadingTracker auto-created jika belum ada
- Accept invite dengan tracker yang sudah ada → tracker tidak duplikat
- Reject invite → status REJECTED, tidak ada RoomMember
- Accept oleh bukan invitee → 403
- Update progress dari room → ReadingSession terbuat dengan roomId, currentPage naik
- Non-member akses detail room → 403
- Buat komentar dari non-member → 403
- Like komentar dua kali oleh user yang sama → 409
- Unlike komentar yang belum di-like → 404
- E2E: create room → invite → accept → update progress → comment → like
