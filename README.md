# SentaraAI

Sistem manajemen logistik dan rantai pasok berbasis kecerdasan buatan yang dirancang untuk mengoptimalkan perencanaan rute pengiriman, manajemen inventaris, dan analisis biaya secara cerdas dan efisien.

---

## Daftar Isi

- [Tampilan Aplikasi](#tampilan-aplikasi)
- [Tentang Proyek](#tentang-proyek)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Fitur Utama](#fitur-utama)
- [Prasyarat](#prasyarat)
- [Cara Menjalankan Proyek](#cara-menjalankan-proyek)
  - [1. Backend Laravel](#1-backend-laravel)
  - [2. Route Engine Python](#2-route-engine-python)
  - [3. Frontend React](#3-frontend-react)
- [Struktur Direktori](#struktur-direktori)
- [Konfigurasi Lingkungan](#konfigurasi-lingkungan)
- [API Endpoint](#api-endpoint)
- [Lisensi](#lisensi)

---

## Tampilan Aplikasi

### 🤖 AI Chat Agent
Asisten logistik berbasis AI yang dapat membantu merencanakan pengiriman secara interaktif menggunakan percakapan natural.

![AI Chat Agent](screenshots/ai-chat-agent.png)

---

### 📦 Smart Sourcing & Route Planner
Simulasi perencanaan rute pengiriman berbasis AI dengan perbandingan biaya dari berbagai sumber dan mode transportasi (SEA / LAND).

![Route Planner](screenshots/route-planner.png)

---

### 💬 AI Chat — Hasil Kalkulasi Rute
Hasil analisis rute optimal yang ditampilkan langsung di dalam percakapan AI, lengkap dengan estimasi biaya, lead time, dan breakdown harga.

![AI Chat Result](screenshots/ai-chat-result.png)

---

## Tentang Proyek

SentaraAI adalah platform logistik cerdas yang menggabungkan tiga layanan utama dalam satu ekosistem terintegrasi. Sistem ini memungkinkan pengguna untuk merencanakan rute pengiriman secara optimal menggunakan algoritma A*, mengelola data master logistik (pelabuhan, SKU, inventaris, tarif), serta berkomunikasi dengan agen AI berbasis Gemini untuk mendapatkan rekomendasi dan analisis logistik secara real-time.

Proyek ini dibangun dengan pendekatan arsitektur microservice, di mana setiap komponen memiliki tanggung jawab yang spesifik dan dapat dikembangkan secara independen.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend React                        │
│           (Antarmuka Pengguna - Vite + React)           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST API
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────┐      ┌──────────────────────┐
│  Backend Laravel │      │  Route Engine Python  │
│  (API Utama +   │      │  (Mesin Perhitungan   │
│   Autentikasi)  │      │   Rute - FastAPI)     │
└────────┬────────┘      └──────────┬───────────┘
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────┐
│            Database (PostgreSQL / SQLite)    │
└─────────────────────────────────────────────┘
```

---

## Teknologi yang Digunakan

### Frontend
| Teknologi | Versi | Keterangan |
|---|---|---|
| React | 19.x | Library antarmuka pengguna |
| Vite | 7.x | Build tool dan dev server |
| React Router DOM | 7.x | Navigasi halaman |
| Tailwind CSS | 4.x | Framework styling |
| Axios | 1.x | HTTP client |
| Lucide React | 0.556.x | Ikon antarmuka |
| Google Generative AI | 1.34.x | Integrasi Gemini AI |

### Backend
| Teknologi | Versi | Keterangan |
|---|---|---|
| Laravel | 11.x | Framework PHP |
| PHP | 8.2+ | Bahasa pemrograman |
| Laravel Sanctum | 4.x | Autentikasi API berbasis token |
| Predis | 3.x | Client Redis untuk caching |

### Route Engine
| Teknologi | Versi | Keterangan |
|---|---|---|
| Python | 3.10+ | Bahasa pemrograman |
| FastAPI | 0.115.x | Framework API asinkron |
| NetworkX | 3.4.x | Implementasi algoritma graf dan A* |
| SQLAlchemy | 2.0.x | ORM database |
| Pydantic | 2.10.x | Validasi data dan skema |
| Uvicorn | 0.32.x | Server ASGI |

---

## Fitur Utama

### Manajemen Data Master
- **Negara dan Kota** - Pengelolaan data wilayah geografis
- **Pelabuhan (Ports)** - Data pelabuhan laut dan darat beserta koordinat
- **SKU (Stock Keeping Unit)** - Manajemen kode produk
- **Kemasan (Packings)** - Konfigurasi jenis kemasan produk
- **Inventaris** - Pemantauan stok di setiap lokasi pelabuhan

### Manajemen Tarif dan Aturan
- **Tarif Pengiriman (Rates)** - Konfigurasi biaya pengiriman per rute
- **Nilai Tukar (FX Rates)** - Pengelolaan nilai tukar mata uang bulanan
- **Aturan Perdagangan (Trade Rules)** - Aturan khusus untuk transaksi perdagangan
- **Rencana Harga (Pricing Plans)** - Paket harga layanan yang fleksibel
- **Mode Transportasi** - Konfigurasi jenis transportasi (laut dan darat)

### Perencanaan Rute
- **Route Planner** - Antarmuka visual untuk merencanakan rute pengiriman
- **Segmen Rute** - Pengelolaan rute antar pelabuhan
- **Perhitungan Rute Optimal** - Menggunakan algoritma A* dengan heuristik Haversine
- **Bobot Prioritas** - Penyesuaian bobot antara jarak dan waktu tempuh
- **Mode Transportasi** - Dukungan mode pengiriman laut (SEA) dan darat (LAND)

### Agen AI (Chat Agent)
- **Asisten Logistik Berbasis AI** - Didukung oleh Google Gemini
- **Analisis Data Real-time** - AI dapat mengakses dan menganalisis data logistik
- **Rekomendasi Cerdas** - Saran optimasi rute dan efisiensi biaya

### Autentikasi dan Keamanan
- **Login Berbasis Token** - Menggunakan Laravel Sanctum
- **Protected Routes** - Halaman terproteksi dengan validasi sesi
- **Role dan Permission** - Sistem hak akses berbasis peran

---

## Prasyarat

Pastikan perangkat Anda telah terinstal:

- **Node.js** versi 18 atau lebih baru
- **PHP** versi 8.2 atau lebih baru
- **Composer** versi 2.x
- **Python** versi 3.10 atau lebih baru
- **pip** (Python package manager)
- **Database**: PostgreSQL atau SQLite

---

## Cara Menjalankan Proyek

### 1. Backend Laravel

```bash
# Masuk ke direktori backend
cd backend-laravel

# Salin file konfigurasi lingkungan
cp .env.example .env

# Install dependensi PHP
composer install

# Generate application key
php artisan key:generate

# Jalankan migrasi database
php artisan migrate

# (Opsional) Jalankan seeder untuk data awal
php artisan db:seed

# Jalankan server development
php artisan serve
```

Server backend akan berjalan di `http://localhost:8000`

---

### 2. Route Engine Python

```bash
# Masuk ke direktori route engine
cd route-engine-python

# (Disarankan) Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Salin file konfigurasi lingkungan
cp .env.example .env
# Kemudian isi variabel DATABASE_URL pada file .env

# Install dependensi Python
pip install -r requirements.txt

# Jalankan server FastAPI
uvicorn main:app --reload --port 8001
```

Server route engine akan berjalan di `http://localhost:8001`

---

### 3. Frontend React

```bash
# Masuk ke direktori frontend
cd frontend-react

# Install dependensi Node.js
npm install

# Salin file konfigurasi lingkungan
cp .env.example .env
# Kemudian isi variabel VITE_API_URL dan VITE_GEMINI_API_KEY

# Jalankan server development
npm run dev
```

Aplikasi frontend akan berjalan di `http://localhost:5173`

---

## Struktur Direktori

```
SentaraAI/
├── frontend-react/              # Aplikasi antarmuka pengguna
│   ├── src/
│   │   ├── components/          # Komponen UI yang dapat digunakan ulang
│   │   ├── contexts/            # React Context (AuthContext, dll)
│   │   ├── pages/               # Halaman-halaman aplikasi
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ChatAgent.jsx    # Agen AI berbasis Gemini
│   │   │   ├── RoutePlanner.jsx # Perencanaan rute interaktif
│   │   │   ├── Ports.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── PricingPlans.jsx
│   │   │   └── ...
│   │   ├── services/            # Fungsi pemanggilan API
│   │   └── utils/               # Fungsi utilitas
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend-laravel/             # API utama berbasis Laravel
│   ├── app/
│   │   ├── Http/
│   │   │   └── Controllers/     # Controller API
│   │   ├── Models/              # Model Eloquent
│   │   │   ├── Port.php
│   │   │   ├── RouteSegment.php
│   │   │   ├── FreightRate.php
│   │   │   ├── PortInventory.php
│   │   │   └── ...
│   │   ├── Services/            # Business logic layer
│   │   └── DTOs/                # Data Transfer Objects
│   ├── database/
│   │   ├── migrations/          # Skema database
│   │   └── seeders/             # Data awal
│   ├── routes/
│   │   └── api.php              # Definisi endpoint API
│   ├── .env.example
│   └── composer.json
│
└── route-engine-python/         # Mesin perhitungan rute
    ├── main.py                  # Entry point FastAPI
    ├── router_engine.py         # Implementasi algoritma A*
    ├── models.py                # Model database SQLAlchemy
    ├── schemas.py               # Skema Pydantic
    ├── database.py              # Koneksi database
    └── requirements.txt
```

---

## Konfigurasi Lingkungan

### Backend Laravel (.env)

Buat file `.env` berdasarkan `.env.example` dan sesuaikan nilai berikut:

```env
APP_NAME=SentaraAI
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sentara_ai
DB_USERNAME=postgres
DB_PASSWORD=your_password

ROUTE_ENGINE_URL=http://localhost:8001
```

### Route Engine Python (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sentara_ai
```

### Frontend React (.env)

```env
VITE_API_URL=http://localhost:8000/api
VITE_ROUTE_ENGINE_URL=http://localhost:8001
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> **Catatan Penting**: Jangan pernah menyertakan nilai API key atau password asli ke dalam repositori. Gunakan file `.env` yang telah masuk dalam daftar `.gitignore`.

---

## API Endpoint

### Backend Laravel

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/login` | Autentikasi pengguna |
| POST | `/api/logout` | Keluar dari sesi |
| GET | `/api/ports` | Daftar semua pelabuhan |
| GET | `/api/skus` | Daftar semua SKU |
| GET | `/api/inventory` | Data inventaris |
| GET | `/api/rates` | Tarif pengiriman |
| GET | `/api/fx-rates` | Nilai tukar mata uang |
| GET | `/api/rules` | Aturan perdagangan |
| GET | `/api/segments` | Segmen rute |
| GET | `/api/pricing-plans` | Rencana harga |

### Route Engine Python

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/` | Health check |
| GET | `/test-db` | Uji koneksi database |
| POST | `/calculate` | Hitung rute optimal dengan algoritma A* |

#### Contoh Request POST /calculate

```json
{
  "origin_id": 1,
  "destination_id": 10,
  "mode": "SEA",
  "weight_distance": 0.5,
  "weight_time": 0.5
}
```

#### Contoh Response

```json
{
  "total_distance_km": 1250.75,
  "total_lead_time_days": 4.2,
  "steps": [
    {
      "from_id": 1,
      "to_id": 5,
      "mode": "SEA",
      "distance": 650.30
    },
    {
      "from_id": 5,
      "to_id": 10,
      "mode": "SEA",
      "distance": 600.45
    }
  ]
}
```

---

## Lisensi

Proyek ini dikembangkan untuk keperluan portofolio dan pembelajaran. Seluruh hak cipta dipegang oleh pengembang.
