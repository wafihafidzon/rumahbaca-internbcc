# PRD: Read with Friends

## Overview
Read with Friends memungkinkan user membaca buku yang sama bersama teman-temannya dalam sebuah Reading Room. Host membuat room, mengundang teman, dan member berbagi progres membaca serta komentar di dalam room. Progres dalam room menggunakan tracker personal masing-masing user — tidak ada data progres terpisah per room.

## Goals
- User bisa membuat reading room untuk buku tertentu dan mengundang teman
- Member room bisa update progres membaca dari dalam room
- Member room bisa melihat progres semua member lain
- Member room bisa berkomentar dan memberikan likes pada komentar
- Akses room terbatas hanya untuk member

## User Stories
- Sebagai host, saya ingin membuat reading room untuk buku yang sedang saya baca
- Sebagai host, saya ingin mengundang teman-teman saya ke room
- Sebagai teman yang diundang, saya ingin menerima atau menolak undangan
- Sebagai member, saya ingin update progres membaca saya dari dalam room
- Sebagai member, saya ingin melihat halaman yang sudah dibaca oleh member lain
- Sebagai member, saya ingin menambahkan komentar di room
- Sebagai member, saya ingin menyukai komentar member lain

## Scope

### In Scope (MVP)
- Buat, list, dan lihat detail Reading Room
- Host mengundang teman (hanya teman dari daftar Friendship)
- Invitee menerima atau menolak undangan
- Accept invite otomatis membuat RoomMember + ReadingTracker jika belum ada
- Update progres dari room → membuat ReadingSession dengan `roomId`
- Lihat progres semua member dari `ReadingTracker.currentPage`
- Flat comments per room (tanpa thread/reply)
- Like/unlike komentar (unik per user per komentar)

### Out of Scope (MVP)
- Room discovery / public rooms
- Direct chat / private messaging
- Threaded reply pada komentar
- Host kick member
- Room invitation ke non-friend
- Privacy control (siapa yang bisa lihat room)
- Reminder atau notifikasi room activity

## Assumptions
- Room tidak punya sumber data progres terpisah; membaca progres dari `ReadingTracker.currentPage` member
- `POST /rooms/:id/progress` membuat `ReadingSession` dengan `roomId` — sama dengan sesi biasa, hanya ditandai asal room
- Jika member belum punya tracker untuk buku room, backend auto-create tracker dengan `currentPage = 0` saat accept invite
- Hanya member yang bisa mengakses detail room, komentar, dan progres room
- Hanya host yang bisa mengundang; invitee terbatas pada Friendship yang sudah aktif
- Flat comments only; tidak ada threading untuk MVP
