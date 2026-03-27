# PRD: Add Friends

## Overview
Add Friends memungkinkan user RumahBaca terhubung satu sama lain melalui mekanisme friend request. Pertemanan bersifat mutual — kedua belah pihak harus menyetujui sebelum koneksi terbentuk. Fitur ini menjadi prasyarat untuk fitur Read with Friends karena room hanya bisa diisi oleh teman host.

## Goals
- User bisa mencari user lain berdasarkan nama atau username
- User bisa mengirim, menerima, dan menolak friend request
- Setelah diterima, terbentuk koneksi Friendship yang bisa dimanfaatkan fitur lain
- User bisa menghapus pertemanan yang sudah ada

## User Stories
- Sebagai user, saya ingin mencari user lain dengan nama atau username
- Sebagai user, saya ingin mengirim friend request ke user lain
- Sebagai user, saya ingin melihat daftar friend request yang masuk
- Sebagai user, saya ingin menerima atau menolak friend request
- Sebagai user, saya ingin melihat daftar teman saya
- Sebagai user, saya ingin menghapus teman dari daftar pertemanan saya

## Scope

### In Scope (MVP)
- Search user berdasarkan nama / username; hasil menyertakan `relationshipStatus`
- Kirim friend request (pending)
- Terima friend request → buat Friendship
- Tolak friend request → tutup request, tidak ada aksi lanjutan
- Batalkan request yang sudah dikirim (cancelled)
- List teman
- Unfriend (hapus Friendship aktif)

### Out of Scope (MVP)
- Block user
- Direct message / chat
- Mutual friend suggestions
- Privacy control (siapa yang bisa add)
- Notifikasi friend request

## Assumptions
- Pertemanan bersifat mutual; tidak ada follow/unfollow satu arah
- Tidak bisa add diri sendiri
- Tidak bisa kirim request jika sudah berteman
- Tidak bisa ada pending request dua arah untuk pasangan user yang sama
- Accept membuat satu record `Friendship` dengan pasangan user terkanonisasi (userId1 < userId2) untuk menjamin uniqueness
- Unfriend menghapus `Friendship` aktif; histori `FriendRequest` tetap ada
- Reject hanya menutup request; tidak memblokir request baru di masa depan
