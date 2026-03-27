# Service: Add Friends

## Business Rules

### Send Friend Request
- User tidak bisa mengirim request ke diri sendiri (`senderId == receiverId` → 400)
- Cek apakah sudah berteman (`Friendship` aktif ada) → tolak dengan 409
- Cek apakah sudah ada request `PENDING` dari sender ke receiver → tolak dengan 409
- Cek apakah ada request `PENDING` dari receiver ke sender (dua arah) → tolak dengan 409
- Buat `FriendRequest` dengan status `PENDING`

### Respond to Friend Request
**Accept:**
- Pastikan `receiverId == currentUser.id`
- Update `FriendRequest.status` ke `ACCEPTED`
- Buat `Friendship` dengan pasangan terkanonisasi (userId1 = min, userId2 = max)
- Kedua operasi dalam satu **Prisma transaction**

**Reject:**
- Pastikan `receiverId == currentUser.id`
- Update `FriendRequest.status` ke `REJECTED`
- Tidak ada aksi lain; tidak memblokir request baru di masa depan

**Cancel (sender membatalkan):**
- Pastikan `senderId == currentUser.id`
- Update `FriendRequest.status` ke `CANCELLED`

### Unfriend
- Query `Friendship` di mana `(userId1 = me AND userId2 = friend) OR (userId1 = friend AND userId2 = me)`
- Jika tidak ditemukan → 404
- Hapus record `Friendship`; histori `FriendRequest` tetap ada

### User Search
- Search berdasarkan `name` atau `username` (case-insensitive, partial match)
- Exclude diri sendiri dari hasil
- Setiap result menyertakan `relationshipStatus`:
  - `none` — tidak ada relasi
  - `friends` — sudah berteman
  - `request_sent` — current user sudah kirim request pending
  - `request_received` — current user menerima request pending

---

## Test Cases

- Search user mengembalikan `relationshipStatus` yang benar untuk tiap kondisi
- Kirim request ke diri sendiri → 400
- Kirim request ke user yang sudah berteman → 409
- Kirim request duplikat (sender → receiver sudah pending) → 409
- Kirim request dua arah (A→B dan B→A di saat yang sama) → 409 untuk yang kedua
- Accept request → Friendship terbentuk, status request berubah ke ACCEPTED
- Reject request → status REJECTED, tidak ada Friendship
- Unfriend menghapus Friendship aktif
- Unfriend mempertahankan histori FriendRequest
- Accept oleh bukan receiver → 403
