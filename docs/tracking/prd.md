# PRD: Tracking

## Overview
Tracking adalah fitur inti RumahBaca yang memungkinkan user mencatat progres membaca buku secara manual, memantau streak harian lintas buku, dan menetapkan goal pribadi (target tanggal selesai atau halaman per hari). Semua progres berbasis halaman, bukan waktu atau persentase.

## Goals
- User bisa menambah buku secara manual dan melacak progres membacanya
- User bisa mencatat sesi baca harian dan melihat histori sesinya
- User mendapat feedback streak lintas buku dengan mekanisme freeze
- User bisa melihat dashboard ringkasan (streak, goal, progres aktif)

## User Stories
- Sebagai user, saya ingin menambah buku manual dengan judul, penulis, dan total halaman
- Sebagai user, saya ingin membuat tracker untuk buku yang sedang saya baca
- Sebagai user, saya ingin mencatat sesi baca hari ini dengan halaman awal dan akhir
- Sebagai user, saya ingin melihat streak saya saat ini dan kalender 7/30 hari terakhir
- Sebagai user, saya ingin menetapkan target selesai atau target halaman per hari
- Sebagai user, saya ingin melihat dashboard ringkasan semua aktivitas membaca saya

## Scope

### In Scope (MVP)
- Input buku manual (judul, penulis, total halaman, cover URL opsional)
- Tracking progres per buku per user (satu tracker aktif per buku)
- Histori sesi baca dengan insight dan foto opsional
- Streak global lintas buku dengan mekanisme freeze otomatis
- Goal: `targetEndDate` dan `dailyPageGoal`
- Dashboard: streak, freeze, kalender, halaman dibaca, buku aktif & selesai, goal summary

### Out of Scope (MVP)
- Integrasi API buku eksternal (Google Books, Open Library, dll.)
- Fuzzy matching dedup buku
- Timezone per-user (default: Asia/Jakarta)
- Reminder/notifikasi streak
- Leaderboard atau social sharing streak

## Assumptions
- Input buku sepenuhnya manual; dedup berdasarkan exact-normalized `title + author`
- Progress utama berbasis `pages`, bukan waktu atau persentase
- Streak dihitung lintas buku; satu hari tetap satu hari walau ada banyak sesi/buku
- Streak aktif setelah 2 hari berturut-turut; counter tampil `2` saat pertama aktif
- Freeze hanya berlaku setelah streak aktif; stok freeze max 2 per siklus
- Timezone default `Asia/Jakarta`; belum per-user timezone
- Tidak ada backdate — tracking hanya untuk hari yang sama atau ke depan
