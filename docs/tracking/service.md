# Service: Tracking

## Tracker Rules
- Satu user hanya boleh punya **satu tracker per buku** (`@@unique([userId, bookId])`)
- Tracker baru selalu dibuat dengan status `ACTIVE` dan `currentPage = 0`
- `status` hanya bisa berubah: `ACTIVE → COMPLETED`, `ACTIVE ↔ PAUSED`
- Jika `endPage == totalPages` saat session dibuat, tracker otomatis di-set `COMPLETED` dan `completedAt` diisi
- Tracker yang sudah `COMPLETED` tidak bisa menerima session baru
- Tidak boleh **backdate** — `trackedAt` harus hari ini (timezone `Asia/Jakarta`)

## Session Rules
- `startPage` harus `>= currentPage` tracker saat ini (tidak boleh mundur)
- `endPage` harus `> startPage` (minimal progres 1 halaman)
- `endPage` tidak boleh melebihi `totalPages` buku
- Setiap session yang valid akan mengupdate `currentPage` tracker ke `endPage`
- Jika session diubah atau dihapus, backend harus **recalculate** ledger streak dan state streak untuk hari yang terdampak

## Streak Rules

### Aktivasi
- Aktivitas valid: membaca minimal **1 halaman** pada hari itu (timezone `Asia/Jakarta`)
- Satu hari hanya dihitung **sekali** untuk streak, walau ada banyak sesi atau buku berbeda
- Streak baru aktif setelah user membaca **2 hari berturut-turut**
- Saat streak pertama kali aktif, `currentCount` yang ditampilkan adalah `2`
- Sebelum streak aktif: `consecutivePreStreakDays` di-increment, `status` tetap `INACTIVE`

### Freeze
- Freeze hanya berlaku setelah streak sudah `ACTIVE`
- Freeze dipakai **otomatis** saat user miss sehari dan `availableFreezes > 0`
- Hari freeze: `status` tetap `ACTIVE`, `currentCount` tidak bertambah, hari di ledger dicatat `FREEZE`
- Stok freeze maksimal **2** per siklus streak; tidak refill di tengah siklus

### Reset
- Jika streak `ACTIVE` dan freeze habis (`availableFreezes == 0`), miss berikutnya langsung **reset**
- Reset: `currentCount = 0`, `status = INACTIVE`, `availableFreezes = 2`, `consecutivePreStreakDays = 0`
- Hari reset dicatat di ledger sebagai `RESET`

### Recalculation
- Triggered saat session diedit atau dihapus
- Backend harus re-derive ledger harian dari semua session aktif yang tersisa
- State streak (`currentCount`, `availableFreezes`, `status`) harus konsisten dengan ledger

## Dashboard & Goal Logic

### Goal Summary (per tracker aktif)
- `targetEndDate`: hitung pages per hari yang dibutuhkan = `(totalPages - currentPage) / daysRemaining`
- `dailyPageGoal`: bandingkan `pagesReadToday` dengan target, return status `on_track | behind | ahead`

### Dashboard Response Shape
```typescript
{
  currentStreak: number
  streakStatus: 'inactive' | 'active' | 'frozen'
  freezeLeft: number
  streakCalendar: Array<{ date: string; status: 'read' | 'freeze' | 'miss' | 'reset' | 'future' }>
  pagesReadToday: number
  pagesReadLast7Days: number
  activeReadings: Array<{ trackerId; bookTitle; currentPage; totalPages; goalSummary }>
  completedBooksCount: number
}
```

---

## Test Cases

### Tracker
- Buat tracker dari buku manual → `currentPage = 0`, `status = ACTIVE`
- Session valid menaikkan `currentPage`
- Session dengan `startPage < currentPage` ditolak (400)
- Session dengan `endPage > totalPages` ditolak (400)
- `endPage == totalPages` → tracker otomatis `COMPLETED`
- Buat tracker kedua untuk buku yang sama oleh user yang sama → ditolak (conflict)
- Goal summary benar untuk `targetEndDate` dan `dailyPageGoal`

### Streak
- Baca hari pertama → `consecutivePreStreakDays = 1`, `status = INACTIVE`
- Baca 2 hari berturut-turut → `status = ACTIVE`, `currentCount = 2`
- Miss sebelum streak aktif → tidak konsumsi freeze, reset `consecutivePreStreakDays`
- Miss saat streak aktif + `availableFreezes > 0` → freeze otomatis, `currentCount` tidak naik
- Hari freeze tidak menaikkan `currentCount`
- Miss saat streak aktif + `availableFreezes == 0` → reset streak
- Reset mengembalikan `availableFreezes` ke `2`
- Banyak sesi dalam satu hari → dihitung satu hari
- Sesi dari buku berbeda pada hari yang sama → dihitung satu hari
- Edit/delete session → recalculation yang benar pada ledger dan state
