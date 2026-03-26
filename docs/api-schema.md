# RumahBaca API Contract

## Scope

Dokumen ini mendefinisikan kontrak API untuk flow yang terlihat pada Figma file `LXodUfnrjMVDMd4osk4laX`, khususnya halaman:

- `Landing page`
- `login`
- `register`
- `home`
- `profile orangnya`
- `edit profile`
- `profile orang lain`
- `share`
- `detail`
- `read together`
- `bUKU`
- `baca bersama`
- `teman`
- `update progres`
- `ruang diskusi`

Dokumen ini adalah kontrak produk yang dipakai untuk implementasi backend dan frontend. Beberapa endpoint `auth`, `users`, dan `posts` sudah ada di backend saat ini, tetapi skema di bawah ini mengikuti kebutuhan fitur dari desain Figma agar cakupan endpoint lengkap.

## Conventions

- Base URL: `/api/v1`
- Authenticated endpoints memakai header `Authorization: Bearer <accessToken>`
- Refresh token dikirim via cookie `refreshToken`
- Content type default: `application/json`
- Timestamps memakai format ISO 8601 UTC, contoh `2026-03-26T09:30:00.000Z`
- Collection responses memakai bentuk `{ "data": [], "meta": {} }`
- Single resource responses memakai bentuk object langsung, kecuali endpoint action yang lebih cocok memakai wrapper

## Error Schema

Semua endpoint dapat mengembalikan schema error berikut:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is invalid"],
    "password": ["Password must be at least 6 characters"]
  },
  "timestamp": "2026-03-26T09:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### Common Error Codes

- `400` validation error / invalid state
- `401` unauthenticated
- `403` forbidden
- `404` resource not found
- `409` conflict / duplicate resource
- `422` business rule violation
- `429` rate limited

## Common Schemas

### PaginationMeta

```json
{
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### UserSummary

```json
{
  "id": "usr_123",
  "username": "tsanyr",
  "displayName": "Sany",
  "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
  "bio": "\"the resident goodreads mean girl\"",
  "isFollowing": false
}
```

### BookSummary

```json
{
  "id": "book_123",
  "title": "The Shark Caller",
  "author": "Zillah Bethell",
  "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
  "ratingAverage": 5,
  "ratingCount": 818,
  "pageCount": 400,
  "format": "Paperback"
}
```

### ReviewSummary

```json
{
  "id": "rev_123",
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
  },
  "author": {
    "id": "usr_123",
    "username": "snoopyyey",
    "displayName": "ProfSnoopy",
    "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
    "isFollowing": true
  },
  "content": "Blue Wing hidup bersama kakek asuhnya...",
  "excerpt": "Blue Wing hidup bersama kakek asuhnya...",
  "likeCount": 818,
  "commentCount": 31,
  "createdAt": "2026-03-26T09:30:00.000Z",
  "updatedAt": "2026-03-26T09:30:00.000Z",
  "likedByMe": false
}
```

### LibraryBook

```json
{
  "id": "lib_123",
  "shelf": "READING",
  "progressPercent": 45,
  "currentPage": 180,
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "author": "Zillah Bethell",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
    "pageCount": 400,
    "format": "Paperback"
  },
  "addedAt": "2026-03-26T09:30:00.000Z",
  "updatedAt": "2026-03-26T09:30:00.000Z"
}
```

### SessionSummary

```json
{
  "id": "sess_123",
  "name": "Aku Suka Baca",
  "description": "YUK belajar cara memanggil hiu",
  "status": "ACTIVE",
  "startDate": "2025-05-27",
  "endDate": "2025-10-04",
  "currentPage": 8,
  "targetPage": 19,
  "memberCount": 3,
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "author": "Zillah Bethell",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
  }
}
```

## Auth

### `POST /auth/register`

Register user baru dari halaman `register`.

Request:

```json
{
  "username": "tsanyr",
  "email": "sany@example.com",
  "password": "secret123",
  "displayName": "Sany"
}
```

Response `201`:

```json
{
  "id": "usr_123",
  "email": "sany@example.com",
  "username": "tsanyr",
  "displayName": "Sany",
  "roles": ["USER"],
  "permissions": []
}
```

### `POST /auth/login`

Login dari halaman `login`.

Request:

```json
{
  "identifier": "tsanyr",
  "password": "secret123",
  "rememberMe": true
}
```

Response `200`:

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "usr_123",
    "email": "sany@example.com",
    "username": "tsanyr",
    "displayName": "Sany",
    "roles": ["USER"],
    "permissions": []
  }
}
```

Notes:

- `identifier` dapat menerima `username` atau `email`
- backend saat ini masih menerima `email`; kontrak ini merekomendasikan perluasan agar sesuai desain

### `POST /auth/refresh`

Response `200`:

```json
{
  "accessToken": "new-jwt-access-token"
}
```

### `POST /auth/logout`

Response `200`:

```json
{
  "message": "Logged out successfully"
}
```


## Landing, Home, and Discovery

### `GET /landing`

Mengisi halaman `Landing page`.

Response `200`:

```json
{
  "hero": {
    "title": "Baca, Bagikan, dan Temukan Buku Favoritmu",
    "subtitle": "Jelajahi berbagai buku menarik...",
    "featuredBooks": [
      {
        "id": "book_123",
        "title": "The Shark Caller",
        "author": "Zillah Bethell",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
      }
    ]
  },
  "streakHighlight": {
    "currentDays": 3,
    "weeklyActivity": [
      { "day": "MON", "completed": true },
      { "day": "TUE", "completed": true },
      { "day": "WED", "completed": false },
      { "day": "THU", "completed": true },
      { "day": "FRI", "completed": false },
      { "day": "SAT", "completed": false },
      { "day": "SUN", "completed": false }
    ]
  },
  "popularReviews": [
    {
      "id": "rev_123",
      "author": {
        "id": "usr_123",
        "username": "snoopyyey",
        "displayName": "ProfSnoopy",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
        "isFollowing": false
      },
      "content": "Blue Wing hidup bersama kakek asuhnya...",
      "excerpt": "Blue Wing hidup bersama kakek asuhnya...",
      "likeCount": 818,
      "commentCount": 31,
      "likedByMe": false,
      "createdAt": "2026-03-26T09:30:00.000Z"
    }
  ]
}
```

### `GET /home`

Mengisi halaman `home` untuk user yang sudah login.

Query params:

- `period`: `weekly` | `monthly`, default `weekly`

Response `200`:

```json
{
  "greeting": {
    "user": {
      "id": "usr_123",
      "username": "tsanyr",
      "displayName": "Sany",
      "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg"
    },
    "currentStreakDays": 12
  },
  "topBooks": [
    {
      "rank": 1,
      "book": {
        "id": "book_123",
        "title": "The Shark Caller",
        "author": "Zillah Bethell",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
        "ratingAverage": 5,
        "ratingCount": 818,
        "pageCount": 400,
        "format": "Paperback"
      }
    }
  ],
  "popularReviews": [
    {
      "id": "rev_123",
      "book": {
        "id": "book_123",
        "title": "The Shark Caller",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
      },
      "author": {
        "id": "usr_123",
        "username": "sunnysun",
        "displayName": "SunnySun",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
        "isFollowing": true
      },
      "content": "Move aside, Nancy Drew!",
      "excerpt": "Move aside, Nancy Drew!",
      "likeCount": 818,
      "commentCount": 31,
      "likedByMe": false,
      "createdAt": "2026-03-26T09:30:00.000Z"
    }
  ]
}
```

### `GET /search`

Dipakai untuk search bar global di `Landing page`, `home`, `detail`, dan page lain.

Query params:

- `q`: string, required
- `type`: `all` | `books` | `reviews` | `users`, default `all`
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": {
    "books": [
      {
        "id": "book_123",
        "title": "The Shark Caller",
        "author": "Zillah Bethell",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
        "ratingAverage": 5,
        "ratingCount": 818,
        "pageCount": 400,
        "format": "Paperback"
      }
    ],
    "reviews": [
      {
        "id": "rev_123",
        "book": {
          "id": "book_123",
          "title": "The Shark Caller",
          "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
        },
        "author": {
          "id": "usr_123",
          "username": "snoopyyey",
          "displayName": "ProfSnoopy",
          "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
          "isFollowing": false
        },
        "content": "Blue Wing hidup bersama kakek asuhnya...",
        "excerpt": "Blue Wing hidup bersama kakek asuhnya...",
        "likeCount": 818,
        "commentCount": 31,
        "createdAt": "2026-03-26T09:30:00.000Z",
        "updatedAt": "2026-03-26T09:30:00.000Z",
        "likedByMe": false
      }
    ],
    "users": [
      {
        "id": "usr_123",
        "username": "snoopyyey",
        "displayName": "ProfSnoopy",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
        "bio": "Spoken word poet...",
        "isFollowing": false
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

## Books

### `GET /books`

Query params:

- `search`: string
- `sortBy`: `popular` | `rating` | `newest` | `title`
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "book_123",
      "title": "The Shark Caller",
      "author": "Zillah Bethell",
      "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
      "ratingAverage": 5,
      "ratingCount": 818,
      "pageCount": 400,
      "format": "Paperback"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `GET /books/:bookId`

Mengisi halaman `detail`.

Response `200`:

```json
{
  "id": "book_123",
  "title": "The Shark Caller",
  "author": "Zillah Bethell",
  "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
  "description": "Karena sangat ingin menjadi pemanggil hiu...",
  "ratingAverage": 5,
  "ratingCount": 818,
  "reviewCount": 40,
  "pageCount": 400,
  "format": "Paperback",
  "publishedAt": "2025-01-01",
  "isbn": "9781234567890",
  "genres": ["Adventure", "Fantasy"],
  "isInLibrary": true,
  "myShelf": "READING",
  "similarBooks": [
    {
      "id": "book_124",
      "title": "Kita Pergi Hari Ini",
      "author": "Author Name",
      "coverImageUrl": "https://cdn.rumahbaca.app/books/kita-pergi-hari-ini.jpg",
      "ratingAverage": 4.32,
      "ratingCount": 3705,
      "pageCount": 280,
      "format": "Paperback"
    }
  ]
}
```

## Reviews

### `GET /books/:bookId/reviews`

Query params:

- `search`: string
- `sortBy`: `popular` | `latest`
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "rev_123",
      "book": {
        "id": "book_123",
        "title": "The Shark Caller",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
      },
      "author": {
        "id": "usr_123",
        "username": "snoopyyey",
        "displayName": "ProfSnoopy",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
        "isFollowing": false
      },
      "content": "Blue Wing hidup bersama kakek asuhnya...",
      "excerpt": "Blue Wing hidup bersama kakek asuhnya...",
      "likeCount": 818,
      "commentCount": 31,
      "createdAt": "2026-03-26T09:30:00.000Z",
      "updatedAt": "2026-03-26T09:30:00.000Z",
      "likedByMe": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 40,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `POST /books/:bookId/reviews`

Request:

```json
{
  "content": "If you like middle grade and the sea, read this book!",
  "rating": 5,
  "containsSpoiler": false
}
```

Response `201`:

```json
{
  "id": "rev_123",
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
  },
  "author": {
    "id": "usr_123",
    "username": "tsanyr",
    "displayName": "Sany",
    "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
    "isFollowing": false
  },
  "content": "If you like middle grade and the sea, read this book!",
  "excerpt": "If you like middle grade and the sea, read this book!",
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "2026-03-26T09:30:00.000Z",
  "updatedAt": "2026-03-26T09:30:00.000Z",
  "likedByMe": false
}
```

### `POST /reviews/:reviewId/likes`

Response `200`:

```json
{
  "reviewId": "rev_123",
  "liked": true,
  "likeCount": 819
}
```

### `DELETE /reviews/:reviewId/likes`

Response `200`:

```json
{
  "reviewId": "rev_123",
  "liked": false,
  "likeCount": 818
}
```

### `GET /reviews/:reviewId/comments`

Query params:

- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "cmt_123",
      "content": "Setuju banget.",
      "author": {
        "id": "usr_123",
        "username": "lala",
        "displayName": "Lala Move",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
        "isFollowing": false
      },
      "createdAt": "2026-03-26T09:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 31,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `POST /reviews/:reviewId/comments`

Request:

```json
{
  "content": "Setuju banget."
}
```

Response `201`:

```json
{
  "id": "cmt_123",
  "content": "Setuju banget.",
  "author": {
    "id": "usr_123",
    "username": "tsanyr",
    "displayName": "Sany",
    "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
    "isFollowing": false
  },
  "createdAt": "2026-03-26T09:30:00.000Z"
}
```

## Library

### `GET /me/library`

Mengisi halaman `bUKU` dan tab buku di profile.

Query params:

- `shelf`: `ALL` | `READ` | `WANT_TO_READ` | `READING`, default `ALL`
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "lib_123",
      "shelf": "READING",
      "progressPercent": 45,
      "currentPage": 180,
      "book": {
        "id": "book_123",
        "title": "The Shark Caller",
        "author": "Zillah Bethell",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
        "ratingAverage": 5,
        "ratingCount": 818,
        "pageCount": 400,
        "format": "Paperback"
      },
      "addedAt": "2026-03-26T09:30:00.000Z",
      "updatedAt": "2026-03-26T09:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `POST /me/library`

Request:

```json
{
  "bookId": "book_123",
  "shelf": "WANT_TO_READ"
}
```

Response `201`:

```json
{
  "id": "lib_123",
  "shelf": "WANT_TO_READ",
  "progressPercent": 0,
  "currentPage": 0,
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "author": "Zillah Bethell",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg",
    "ratingAverage": 5,
    "ratingCount": 818,
    "pageCount": 400,
    "format": "Paperback"
  },
  "addedAt": "2026-03-26T09:30:00.000Z",
  "updatedAt": "2026-03-26T09:30:00.000Z"
}
```

### `PATCH /me/library/:libraryBookId`

Request:

```json
{
  "shelf": "READING",
  "currentPage": 180
}
```

Response `200`: `LibraryBook`

### `DELETE /me/library/:libraryBookId`

Response `200`:

```json
{
  "message": "Book removed from library"
}
```

## Profiles and Social

### `GET /me/profile`

Mengisi halaman `profile orangnya`.

Response `200`:

```json
{
  "id": "usr_123",
  "username": "tsanyr",
  "displayName": "Sany",
  "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
  "bio": "\"the resident goodreads mean girl\"",
  "stats": {
    "booksRead": 23,
    "reviewCount": 12,
    "friendCount": 6,
    "streakDays": 12
  },
  "libraryPreview": {
    "reading": [],
    "read": [],
    "wantToRead": []
  },
  "reviewPreview": []
}
```

### `PATCH /me/profile`

Mengisi form pada halaman `edit profile`.

Request:

```json
{
  "displayName": "Sany",
  "username": "tsanyr",
  "bio": "i read a lot of books and i review a lot of books"
}
```

Response `200`:

```json
{
  "id": "usr_123",
  "username": "tsanyr",
  "displayName": "Sany",
  "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
  "bio": "i read a lot of books and i review a lot of books"
}
```

### `POST /me/profile/avatar`

Content type: `multipart/form-data`

Form fields:

- `file`: binary, max 2 MB, allowed `jpg`, `jpeg`, `png`

Response `200`:

```json
{
  "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123_v2.jpg"
}
```

### `DELETE /me/profile/avatar`

Response `200`:

```json
{
  "message": "Avatar removed successfully"
}
```

### `GET /users/:username`

Mengisi halaman `profile orang lain`.

Response `200`:

```json
{
  "id": "usr_456",
  "username": "snoopyyey",
  "displayName": "ProfSnoopy",
  "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_456.jpg",
  "bio": "Spoken word poet paying attention...",
  "stats": {
    "booksRead": 40,
    "reviewCount": 30,
    "friendCount": 11,
    "streakDays": 8
  },
  "isFollowing": true,
  "libraryPreview": {
    "reading": [],
    "read": [],
    "wantToRead": []
  },
  "reviewPreview": []
}
```

### `POST /users/:userId/follow`

Response `200`:

```json
{
  "userId": "usr_456",
  "isFollowing": true,
  "followerCount": 101
}
```

### `DELETE /users/:userId/follow`

Response `200`:

```json
{
  "userId": "usr_456",
  "isFollowing": false,
  "followerCount": 100
}
```

### `GET /friends`

Mengisi halaman `teman`.

Query params:

- `search`: string
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "usr_789",
      "username": "bellaswan",
      "displayName": "Bella",
      "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_789.jpg",
      "stats": {
        "booksRead": 89,
        "friendCount": 12
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Streak

### `GET /me/streak`

Mengisi komponen streak di `Landing page`, `home`, dan share sheet.

Response `200`:

```json
{
  "currentDays": 50,
  "bestDays": 80,
  "lastReadAt": "2026-03-25T21:10:00.000Z",
  "weeklyActivity": [
    { "day": "MON", "completed": true },
    { "day": "TUE", "completed": true },
    { "day": "WED", "completed": false },
    { "day": "THU", "completed": true },
    { "day": "FRI", "completed": false },
    { "day": "SAT", "completed": false },
    { "day": "SUN", "completed": false }
  ]
}
```

### `POST /me/streak/share`

Mengisi halaman `share`.

Request:

```json
{
  "channel": "download"
}
```

Response `200`:

```json
{
  "title": "50 Day Streak!",
  "subtitle": "That’s insane 50 days of reading. No breaks.",
  "shareImageUrl": "https://cdn.rumahbaca.app/share/streak_50_usr_123.png"
}
```

## Reading Sessions

### `POST /reading-sessions`

Mengisi form halaman `read together`.

Request:

```json
{
  "bookId": "book_123",
  "name": "Aku Suka Baca",
  "description": "YUK belajar cara memanggil hiu",
  "startDate": "2025-05-27",
  "endDate": "2025-10-04",
  "memberIds": ["usr_123", "usr_456", "usr_789"]
}
```

Response `201`:

```json
{
  "id": "sess_123",
  "name": "Aku Suka Baca",
  "description": "YUK belajar cara memanggil hiu",
  "status": "ACTIVE",
  "startDate": "2025-05-27",
  "endDate": "2025-10-04",
  "currentPage": 0,
  "targetPage": 19,
  "memberCount": 3,
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "author": "Zillah Bethell",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
  }
}
```

### `GET /reading-sessions`

Mengisi halaman `baca bersama`.

Query params:

- `tab`: `active` | `all`, default `active`
- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "sess_123",
      "name": "Aku Suka Baca",
      "description": "YUK belajar cara memanggil hiu",
      "status": "ACTIVE",
      "startDate": "2025-05-27",
      "endDate": "2025-10-04",
      "currentPage": 8,
      "targetPage": 19,
      "memberCount": 3,
      "book": {
        "id": "book_123",
        "title": "The Shark Caller",
        "author": "Zillah Bethell",
        "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### `GET /reading-sessions/:sessionId`

Response `200`:

```json
{
  "id": "sess_123",
  "name": "Aku Suka Baca",
  "description": "YUK belajar cara memanggil hiu",
  "status": "ACTIVE",
  "startDate": "2025-05-27",
  "endDate": "2025-10-04",
  "currentPage": 8,
  "targetPage": 19,
  "memberCount": 3,
  "book": {
    "id": "book_123",
    "title": "The Shark Caller",
    "author": "Zillah Bethell",
    "coverImageUrl": "https://cdn.rumahbaca.app/books/the-shark-caller.jpg"
  },
  "members": [
    {
      "id": "usr_123",
      "username": "tsanyr",
      "displayName": "Sany",
      "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
      "bio": "\"the resident goodreads mean girl\"",
      "isFollowing": false
    }
  ]
}
```

### `PATCH /reading-sessions/:sessionId`

Request:

```json
{
  "name": "Aku Suka Baca",
  "description": "YUK belajar cara memanggil hiu",
  "startDate": "2025-05-27",
  "endDate": "2025-10-04"
}
```

Response `200`: `SessionSummary`

### `POST /reading-sessions/:sessionId/progress`

Mengisi modal `update progres`.

Request:

```json
{
  "currentPage": 8
}
```

Response `200`:

```json
{
  "sessionId": "sess_123",
  "currentPage": 8,
  "targetPage": 19,
  "progressPercent": 42.11,
  "updatedAt": "2026-03-26T09:30:00.000Z"
}
```

### `GET /reading-sessions/:sessionId/progress`

Response `200`:

```json
{
  "sessionId": "sess_123",
  "currentPage": 8,
  "targetPage": 19,
  "progressPercent": 42.11,
  "updatedAt": "2026-03-26T09:30:00.000Z"
}
```

### `POST /reading-sessions/:sessionId/members`

Request:

```json
{
  "memberIds": ["usr_456", "usr_789"]
}
```

Response `200`:

```json
{
  "sessionId": "sess_123",
  "memberCount": 3
}
```

### `DELETE /reading-sessions/:sessionId/members/:userId`

Response `200`:

```json
{
  "sessionId": "sess_123",
  "memberCount": 2
}
```

## Discussion Room

### `GET /reading-sessions/:sessionId/discussions`

Mengisi halaman `ruang diskusi`.

Query params:

- `page`: number
- `limit`: number

Response `200`:

```json
{
  "data": [
    {
      "id": "disc_123",
      "content": "Aku baru kelar chapter 5! PLOT TWISTNYA GONG BANGET.",
      "author": {
        "id": "usr_456",
        "username": "lala",
        "displayName": "Lala Move",
        "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_456.jpg",
        "isFollowing": false
      },
      "likeCount": 1,
      "replyCount": 1,
      "likedByMe": false,
      "createdAt": "2026-03-26T09:30:00.000Z",
      "replies": [
        {
          "id": "disc_124",
          "content": "OIIII IYAA SETUJU BANGET.",
          "author": {
            "id": "usr_789",
            "username": "udangkedu",
            "displayName": "Udang Kedu",
            "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_789.jpg",
            "isFollowing": false
          },
          "likeCount": 5,
          "replyCount": 0,
          "likedByMe": false,
          "createdAt": "2026-03-26T09:31:00.000Z"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `POST /reading-sessions/:sessionId/discussions`

Request:

```json
{
  "content": "Bagikan opinimu"
}
```

Response `201`:

```json
{
  "id": "disc_123",
  "content": "Bagikan opinimu",
  "author": {
    "id": "usr_123",
    "username": "tsanyr",
    "displayName": "Sany",
    "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_123.jpg",
    "isFollowing": false
  },
  "likeCount": 0,
  "replyCount": 0,
  "likedByMe": false,
  "createdAt": "2026-03-26T09:30:00.000Z",
  "replies": []
}
```

### `POST /reading-sessions/:sessionId/discussions/:discussionId/replies`

Request:

```json
{
  "content": "Setuju banget."
}
```

Response `201`:

```json
{
  "id": "disc_124",
  "content": "Setuju banget.",
  "author": {
    "id": "usr_789",
    "username": "udangkedu",
    "displayName": "Udang Kedu",
    "avatarUrl": "https://cdn.rumahbaca.app/avatar/usr_789.jpg",
    "isFollowing": false
  },
  "likeCount": 0,
  "replyCount": 0,
  "likedByMe": false,
  "createdAt": "2026-03-26T09:31:00.000Z"
}
```

### `POST /reading-sessions/:sessionId/discussions/:discussionId/likes`

Response `200`:

```json
{
  "discussionId": "disc_123",
  "liked": true,
  "likeCount": 2
}
```

### `DELETE /reading-sessions/:sessionId/discussions/:discussionId/likes`

Response `200`:

```json
{
  "discussionId": "disc_123",
  "liked": false,
  "likeCount": 1
}
```

## Suggested Domain Enums

```ts
type LibraryShelf = 'READ' | 'WANT_TO_READ' | 'READING';
type ReadingSessionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type SearchType = 'all' | 'books' | 'reviews' | 'users';
type SortReviewBy = 'popular' | 'latest';
type SortBookBy = 'popular' | 'rating' | 'newest' | 'title';
```

## Implementation Notes

- `posts` yang ada di backend saat ini paling dekat dengan domain `reviews`, tetapi masih belum punya relasi ke `books`, `likes`, dan `comments`
- domain `books`, `library`, `streak`, `friends`, `reading-sessions`, dan `discussions` belum terlihat ada di schema Prisma sekarang
- kontrak ini sudah mencakup semua blok UI yang terlihat di Figma dan bisa dipakai sebagai dasar Swagger/OpenAPI yang lebih formal
