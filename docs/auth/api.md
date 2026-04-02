# API: Auth

Semua endpoint auth bersifat publik kecuali `/auth/logout` yang membutuhkan access token.

---

## Authentication Overview

| Token | Tipe | Durasi | Penyimpanan |
|-------|------|--------|-------------|
| Access token | Bearer JWT | 15 menit | Authorization header |
| Refresh token | JWT | 7 hari | httpOnly cookie (`refreshToken`) |

**Menggunakan access token:**
```
Authorization: Bearer <accessToken>
```

---

## POST /auth/register

Daftarkan user baru. Secara otomatis mendapat role `USER`.

**Auth:** Publik

**Request body:**
```json
{
  "email": "user@example.com",
  "username": "username123",
  "password": "password123",
  "name": "John Doe"
}
```

| Field | Tipe | Validasi |
|-------|------|----------|
| `email` | string | required, format email valid |
| `username` | string | required, minimal 3 karakter |
| `password` | string | required, minimal 6 karakter |
| `name` | string | required |

**Response `201`:**
```json
{
  "id": "clw1234567890",
  "email": "user@example.com",
  "username": "username123",
  "roles": ["USER"]
}
```

**Errors:**
- `400` — email atau username sudah digunakan

---

## POST /auth/login

Login dengan email dan password. Mengembalikan access token dan menyimpan refresh token di cookie.

**Auth:** Publik

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| Field | Tipe | Validasi |
|-------|------|----------|
| `email` | string | required, format email valid |
| `password` | string | required, minimal 6 karakter |

**Response `200`:**
```json
{
  "accessToken": "<jwt_access_token>",
  "user": {
    "id": "clw1234567890",
    "email": "user@example.com",
    "username": "username123",
    "roles": ["USER"]
  }
}
```

**Cookie yang di-set:**
- `refreshToken` — httpOnly, secure, sameSite: strict, expires sesuai `JWT_REFRESH_EXPIRATION`

**Errors:**
- `401` — email tidak ditemukan atau password salah

---

## GET /auth/google

Initiate login via Google OAuth2. Browser diarahkan ke halaman login Google.

**Auth:** Publik

**Response `302`:** Redirect ke Google OAuth2 consent screen

---

## GET /auth/google/callback

Callback dari Google setelah user mengizinkan akses. User dibuat otomatis jika belum ada.

**Auth:** Publik (ditangani Google OAuth2)

**Response `200`:**
```json
{
  "accessToken": "<jwt_access_token>",
  "user": {
    "id": "clw1234567890",
    "email": "user@example.com",
    "username": "username123",
    "roles": ["USER"]
  }
}
```

**Cookie yang di-set:**
- `refreshToken` — httpOnly, secure, sameSite: strict

---

## POST /auth/refresh

Tukar refresh token (dari cookie) dengan access token baru.

**Auth:** Cookie `refreshToken` (wajib ada)

**Request:** Tidak perlu body. Refresh token dibaca otomatis dari cookie.

**Response `200`:**
```json
{
  "accessToken": "<jwt_access_token_baru>"
}
```

**Errors:**
- `401` — refresh token tidak ada, tidak valid, atau sudah expired

---

## POST /auth/logout

Logout dan hapus semua refresh token user dari database.

**Auth:** Bearer token (wajib, `JwtAuthGuard`)

**Request:** Tidak perlu body.

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

**Errors:**
- `401` — access token tidak ada atau tidak valid
