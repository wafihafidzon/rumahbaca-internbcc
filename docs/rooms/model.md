# Model: Read with Friends

## Prisma Models

### ReadingRoom
Room tempat host dan member membaca buku yang sama bersama.

```prisma
model ReadingRoom {
  id          String          @id @default(cuid())
  hostId      String
  bookId      String
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  status      RoomStatus      @default(ACTIVE)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  host     User             @relation("HostedRooms", fields: [hostId], references: [id])
  book     Book             @relation(fields: [bookId], references: [id])
  invites  RoomInvite[]
  members  RoomMember[]
  comments RoomComment[]
  sessions ReadingSession[]
}

enum RoomStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}
```

---

### RoomInvite
Undangan dari host ke teman. Hanya teman host yang bisa diundang.

```prisma
model RoomInvite {
  id        String           @id @default(cuid())
  roomId    String
  inviteeId String
  status    RoomInviteStatus @default(PENDING)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  room    ReadingRoom @relation(fields: [roomId], references: [id])
  invitee User        @relation(fields: [inviteeId], references: [id])

  @@unique([roomId, inviteeId])
}

enum RoomInviteStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

---

### RoomMember
Member aktif room, terbentuk setelah invite accepted.

```prisma
model RoomMember {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  joinedAt  DateTime @default(now())

  room ReadingRoom @relation(fields: [roomId], references: [id])
  user User        @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
}
```

---

### RoomComment
Komentar flat di dalam room. Tidak ada threading untuk MVP.

```prisma
model RoomComment {
  id        String   @id @default(cuid())
  roomId    String
  authorId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  room   ReadingRoom       @relation(fields: [roomId], references: [id])
  author User              @relation(fields: [authorId], references: [id])
  likes  RoomCommentLike[]
}
```

---

### RoomCommentLike
Like pada komentar. Unik per `commentId-userId`.

```prisma
model RoomCommentLike {
  id        String   @id @default(cuid())
  commentId String
  userId    String
  createdAt DateTime @default(now())

  comment RoomComment @relation(fields: [commentId], references: [id])
  user    User        @relation(fields: [userId], references: [id])

  @@unique([commentId, userId])
}
```

---

## Relationships

```
ReadingRoom
 ├── RoomInvite[]   (undangan dari host)
 ├── RoomMember[]   (member aktif setelah accept)
 ├── RoomComment[]  (flat comments)
 └── ReadingSession[] (sesi yang dibuat dari room, via roomId)

RoomComment
 └── RoomCommentLike[] (unik per commentId-userId)

User
 ├── ReadingRoom[]  as host
 ├── RoomInvite[]   as invitee
 ├── RoomMember[]
 ├── RoomComment[]  as author
 └── RoomCommentLike[]
```

**Catatan progres:** Progres member dibaca dari `ReadingTracker.currentPage`, bukan dari model tersendiri di room.
