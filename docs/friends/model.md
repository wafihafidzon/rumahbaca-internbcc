# Model: Add Friends

## Prisma Models

### FriendRequest
Merepresentasikan permintaan pertemanan dari satu user ke user lain.

```prisma
model FriendRequest {
  id         String              @id @default(cuid())
  senderId   String
  receiverId String
  status     FriendRequestStatus @default(PENDING)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt

  sender   User @relation("SentRequests", fields: [senderId], references: [id])
  receiver User @relation("ReceivedRequests", fields: [receiverId], references: [id])

  @@unique([senderId, receiverId])
}

enum FriendRequestStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
}
```

**Constraint bidirectional:** Sebelum membuat request baru dari A ke B, service harus memeriksa tidak ada request `PENDING` dari B ke A.

---

### Friendship
Merepresentasikan koneksi mutual yang sudah accepted. Pasangan user dikanonisasi untuk menjamin uniqueness.

```prisma
model Friendship {
  id        String   @id @default(cuid())
  userId1   String
  userId2   String
  createdAt DateTime @default(now())

  user1 User @relation("FriendshipUser1", fields: [userId1], references: [id])
  user2 User @relation("FriendshipUser2", fields: [userId2], references: [id])

  @@unique([userId1, userId2])
}
```

**Kanonisasi:** Saat membuat `Friendship`, selalu simpan `userId1 = min(userA, userB)` dan `userId2 = max(userA, userB)` secara leksikografis. Ini mencegah duplikasi `(A,B)` dan `(B,A)`.

---

## Relationships

```
User
 ├── FriendRequest[] as sender   (sent by this user)
 ├── FriendRequest[] as receiver (received by this user)
 ├── Friendship[] as userId1     (canonicalized)
 └── Friendship[] as userId2     (canonicalized)
```

**Query helper:** Untuk mendapatkan semua teman user X, query Friendship di mana `userId1 = X OR userId2 = X`.
