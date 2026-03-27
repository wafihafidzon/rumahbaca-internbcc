# Model: Tracking

## Prisma Models

### Book
Buku yang diinput secara manual oleh user.

```prisma
model Book {
  id            String   @id @default(cuid())
  title         String
  author        String
  totalPages    Int
  coverUrl      String?
  createdByUserId String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  createdBy     User             @relation(fields: [createdByUserId], references: [id])
  trackers      ReadingTracker[]
  rooms         ReadingRoom[]
}
```

**Dedup rule:** `title` + `author` di-normalize (lowercase, trim whitespace) sebelum insert. Jika kombinasi sudah ada, kembalikan buku yang existing.

---

### ReadingTracker
Progress utama user per buku. Satu user hanya boleh punya satu tracker aktif per buku.

```prisma
model ReadingTracker {
  id              String               @id @default(cuid())
  userId          String
  bookId          String
  currentPage     Int                  @default(0)
  status          ReadingTrackerStatus @default(ACTIVE)
  startedAt       DateTime             @default(now())
  completedAt     DateTime?
  targetEndDate   DateTime?
  dailyPageGoal   Int?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  user     User             @relation(fields: [userId], references: [id])
  book     Book             @relation(fields: [bookId], references: [id])
  sessions ReadingSession[]

  @@unique([userId, bookId])
}

enum ReadingTrackerStatus {
  ACTIVE
  COMPLETED
  PAUSED
}
```

---

### ReadingSession
Histori update progres per sesi baca. Terhubung ke tracker; opsional terhubung ke room.

```prisma
model ReadingSession {
  id               String   @id @default(cuid())
  readingTrackerId String
  trackedAt        DateTime @default(now())
  startPage        Int
  endPage          Int
  durationMinutes  Int?
  insight          String?
  photoUrl         String?
  roomId           String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tracker ReadingTracker @relation(fields: [readingTrackerId], references: [id])
  room    ReadingRoom?   @relation(fields: [roomId], references: [id])
}
```

---

### UserReadingStreak
State streak terkini per user. Streak bersifat global lintas buku.

```prisma
model UserReadingStreak {
  id                      String       @id @default(cuid())
  userId                  String       @unique
  currentCount            Int          @default(0)
  status                  StreakStatus @default(INACTIVE)
  availableFreezes        Int          @default(2)
  lastActiveDate          DateTime?
  lastCountedDate         DateTime?
  consecutivePreStreakDays Int         @default(0)
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt

  user User               @relation(fields: [userId], references: [id])
  days UserReadingStreakDay[]
}

enum StreakStatus {
  INACTIVE
  ACTIVE
  FROZEN
}
```

---

### UserReadingStreakDay
Ledger harian untuk audit streak. Satu record per user per hari.

```prisma
model UserReadingStreakDay {
  id               String         @id @default(cuid())
  userId           String
  date             DateTime       @db.Date
  status           StreakDayStatus
  pagesRead        Int            @default(0)
  sourceSessionCount Int          @default(0)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  user   User              @relation(fields: [userId], references: [id])
  streak UserReadingStreak @relation(fields: [userId], references: [userId])

  @@unique([userId, date])
}

enum StreakDayStatus {
  READ
  FREEZE
  MISS
  RESET
}
```

---

## Relationships

```
User
 ├── Book[] (createdBy)
 ├── ReadingTracker[] (one per book, unique userId+bookId)
 ├── UserReadingStreak (one per user)
 └── UserReadingStreakDay[] (one per user per date)

ReadingTracker
 └── ReadingSession[] (histori sesi, opsional roomId)

ReadingSession
 └── ReadingRoom? (jika sesi berasal dari room)
```
