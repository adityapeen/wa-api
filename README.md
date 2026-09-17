# WhatsApp API

REST API berbasis Node.js untuk menghubungkan aplikasi dengan akun WhatsApp melalui `whatsapp-web.js`. Repository ini menyediakan pengiriman pesan teks, pengiriman file/media, penghapusan pesan, pengecekan status API, autentikasi WhatsApp menggunakan QR Code, Socket.IO untuk status koneksi real-time, callback ke aplikasi eksternal, serta logging aplikasi dan HTTP.

Repository: https://github.com/adityapeen/wa-api

## 1. Fitur

- Integrasi WhatsApp menggunakan `whatsapp-web.js`.
- Autentikasi sesi menggunakan `LocalAuth`.
- Portal web pada `/` untuk menampilkan QR Code dan aktivitas koneksi secara real-time.
- REST API untuk:
  - mengirim pesan teks;
  - mengirim file/media dengan caption;
  - menghapus pesan yang dikirim oleh akun sendiri;
  - mengecek apakah service API aktif.
- Basic Authentication untuk endpoint API menggunakan environment variable.
- Callback ke aplikasi eksternal setelah pengiriman pesan.
- Integrasi Google Gemini untuk command `.ask`.
- Logging aplikasi dengan Winston dan rotasi file log bulanan.
- HTTP request logging menggunakan Morgan.

## 2. Teknologi

| Komponen | Teknologi |
|---|---|
| Runtime | Node.js |
| HTTP Framework | Express 4 |
| WhatsApp Client | whatsapp-web.js |
| Browser Automation | Puppeteer |
| Real-time | Socket.IO |
| Validation | express-validator |
| Upload | express-fileupload |
| HTTP Client | Axios |
| QR Code | qrcode, qrcode-terminal |
| AI | Google GenAI |
| Logging | Winston, winston-daily-rotate-file, Morgan |
| Configuration | dotenv |

## 3. Struktur Repository

```text
wa-api/
├── App.js
├── helpers/
│   └── formatter.js
├── public/
│   └── views/
│       └── index.html
├── utils/
│   ├── httpLogger.js
│   └── logger.js
├── .env-example
├── .gitignore
├── package.json
└── package-lock.json
```

## 4. Prasyarat

Pastikan server memiliki:

- Node.js dan npm.
- Akses internet.
- Browser dependency yang dapat digunakan Puppeteer.
- Nomor WhatsApp yang dapat digunakan sebagai perangkat tertaut.
- Google Gemini API key apabila fitur `.ask` digunakan.

## 5. Instalasi

```bash
git clone https://github.com/adityapeen/wa-api.git
cd wa-api
npm install
```

## 6. Konfigurasi Environment

Salin file contoh:

```bash
cp .env-example .env
```

Contoh:

```env
PORT=5000
API_USER=John
API_PASSWORD=Doe
APP_URL=https://example.com
API_KEY=your-google-gemini-api-key
HTTP_LOGGER=file
LOG_CONSOLE=true
LOG_LEVEL=info
```

### Environment Variables

| Variabel | Wajib | Keterangan |
|---|---:|---|
| `PORT` | Ya | Port HTTP server. Default `5000`. |
| `API_USER` | Ya | Username Basic Authentication. |
| `API_PASSWORD` | Ya | Password Basic Authentication. |
| `APP_URL` | Untuk callback/user lookup | Base URL aplikasi eksternal. |
| `API_KEY` | Untuk AI | Google GenAI API key. |
| `HTTP_LOGGER` | Tidak | `console`, `file`, atau `off`. |
| `LOG_CONSOLE` | Tidak | `true` untuk menampilkan log di console. |
| `LOG_LEVEL` | Tidak | Level Winston, default `info`. |

> **Security:** jangan commit `.env`, password, atau API key ke repository.

## 7. Menjalankan Aplikasi

### Development

```bash
node App.js
```

### Menggunakan npm

```bash
npm start
```

Script `start` menjalankan:

```bash
node App.js
```

Setelah server aktif, buka:

```text
http://localhost:5000/
```

Sesuaikan port dengan konfigurasi `PORT`.

## 8. Autentikasi WhatsApp

Client WhatsApp menggunakan `LocalAuth`, sehingga sesi dapat dipulihkan setelah restart selama data sesi masih tersedia.

Saat aplikasi dijalankan, QR Code tersedia melalui:

1. Terminal.
2. Portal web.
3. Socket.IO.

### Prosedur pairing

1. Jalankan aplikasi.
2. Buka `http://localhost:<PORT>/`.
3. Tunggu QR Code.
4. Buka WhatsApp pada ponsel.
5. Masuk ke **Perangkat Tertaut**.
6. Pilih **Hubungkan Perangkat**.
7. Scan QR Code.
8. Tunggu status menjadi **Connected**.

## 9. Format Nomor WhatsApp

Helper `phoneNumberFormatter()` melakukan normalisasi nomor:

```text
081234567890
        ↓
6281234567890@c.us
```

Nomor yang diawali `0` akan diubah menjadi `62`, kemudian ditambahkan suffix `@c.us`.

Contoh:

```text
Input:
081234567890

Output:
6281234567890@c.us
```

## 10. Authentication API

Endpoint API yang membutuhkan authentication menggunakan:

```http
Authorization: Basic <credentials>
```

Token dibentuk dari:

```text
API_USER:API_PASSWORD
```

kemudian di-encode menggunakan Base64.

Contoh:

```text
John:Doe
    ↓
Sm9objpEb2U=
    ↓
Basic Sm9objpEb2U=
```

Contoh header:

```http
Authorization: Basic Sm9objpEb2U=
```

## 11. API Endpoint

### 11.1 GET `/`

Menampilkan portal autentikasi WhatsApp.

```http
GET /
```

Portal menampilkan:

- QR Code.
- Status koneksi.
- Connection Activity.
- Server status.

---

### 11.2 POST `/check`

Mengecek apakah API sedang online.

```http
POST /check
```

Tidak membutuhkan authentication.

Response:

```json
{
  "status": true,
  "message": "API is Online"
}
```

Contoh:

```bash
curl -X POST http://localhost:5000/check
```

---

### 11.3 POST `/send-message`

Mengirim pesan WhatsApp.

```http
POST /send-message
Authorization: Basic <credentials>
```

#### Request teks

```http
Content-Type: application/json
```

```json
{
  "number": "081234567890",
  "message": "Halo dari WhatsApp API"
}
```

#### Parameter

| Field | Wajib | Tipe | Keterangan |
|---|---:|---|---|
| `number` | Ya | string | Nomor tujuan WhatsApp |
| `message` | Ya | string | Isi pesan/caption |
| `file` | Tidak | file | File yang akan dikirim |
| `id` | Tidak | string | Identifier callback |

#### Response sukses

```json
{
  "status": true,
  "response": {}
}
```

`response` berisi object hasil dari `client.sendMessage()`.

#### Unauthorized

HTTP `403`:

```json
{
  "status": false,
  "message": "Not Authorized"
}
```

#### Validation error

HTTP `422`:

```json
{
  "status": false,
  "message": {}
}
```

#### Nomor tidak terdaftar

HTTP `422`:

```json
{
  "status": false,
  "message": "The number is not registered"
}
```

### Contoh cURL teks

```bash
curl -X POST http://localhost:5000/send-message \
  -H "Authorization: Basic $(printf '%s' 'John:Doe' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "081234567890",
    "message": "Halo dari API"
  }'
```

### Mengirim file

Gunakan `multipart/form-data`:

```bash
curl -X POST http://localhost:5000/send-message \
  -H "Authorization: Basic $(printf '%s' 'John:Doe' | base64)" \
  -F "number=081234567890" \
  -F "message=Dokumen terlampir" \
  -F "file=@/path/to/document.pdf" \
  -F "id=123;456"
```

File dikirim sebagai document dengan caption yang berasal dari `message`.

---

### 11.4 POST `/delete-message`

Menghapus pesan yang dikirim oleh akun WhatsApp sendiri.

```http
POST /delete-message
Authorization: Basic <credentials>
Content-Type: application/json
```

Request:

```json
{
  "number": "081234567890",
  "messageId": "true_6281234567890_ABCDEF"
}
```

#### Parameter

| Field | Wajib | Tipe | Keterangan |
|---|---:|---|---|
| `number` | Ya | string | Nomor chat |
| `messageId` | Ya | string | Serialized message ID |

#### Response sukses

```json
{
  "status": true,
  "message": "Pesan telah berhasil dihapus"
}
```

#### Message tidak ditemukan

```json
{
  "status": false,
  "message": "Pesan tidak ditemukan"
}
```

#### Error

HTTP `500`:

```json
{
  "status": false,
  "message": "Gagal menghapus pesan"
}
```

### Contoh

```bash
curl -X POST http://localhost:5000/delete-message \
  -H "Authorization: Basic $(printf '%s' 'John:Doe' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "081234567890",
    "messageId": "true_6281234567890_ABCDEF"
  }'
```

> **Catatan:** implementasi saat ini mengambil maksimal 10 pesan terbaru yang berasal dari akun sendiri. Jika target message berada di luar 10 pesan tersebut, message dapat dianggap tidak ditemukan.

## 12. Callback ke Aplikasi Eksternal

Setelah pengiriman pesan berhasil, aplikasi dapat memanggil callback jika field `id` tersedia.

Format:

```text
{idPertama};{idKedua}
```

URL callback:

```text
{APP_URL}/mom_status/{idKedua}/{idPertama}
```

Contoh:

```text
id = 123;456
APP_URL = https://example.com

GET https://example.com/mom_status/456/123
```

Callback menggunakan Basic Authentication.

## 13. User Profile Lookup

Command:

```text
.username
```

akan melakukan request:

```text
GET {APP_URL}/user_profile/{number}
```

Nomor WhatsApp dikonversi oleh `clientIdDeformatter()` menjadi nomor lokal kemudian di-encode Base64.

Alur:

```text
6281234567890@c.us
        ↓
081234567890
        ↓
Base64
```

Response yang digunakan adalah field `message`.

## 14. Integrasi Google Gemini

Aplikasi memproses command tertentu dari pesan masuk.

### `!ping`

Request:

```text
!ping
```

Response:

```text
pong
```

### `.username`

Request:

```text
.username
```

Service mengambil informasi user dari endpoint eksternal.

### `.ask`

Pesan yang diawali `.ask` diproses oleh Google Gemini.

Contoh:

```text
.ask Jelaskan apa itu energi terbarukan.
```

`.ask` akan dibersihkan sebelum prompt dikirim ke model.

Model yang digunakan:

```text
gemini-2.0-flash
```

System instruction:

```text
Gunakan bahasa singkat
```

Fitur ini membutuhkan:

```env
API_KEY=your-google-gemini-api-key
```

## 15. Socket.IO

Socket.IO digunakan untuk komunikasi real-time antara backend dan portal.

### Event `message`

Server → Browser.

Digunakan untuk status seperti:

```text
Connecting...
QR Code Received
Client is ready!
```

### Event `qr`

Server → Browser.

Mengirim QR Code dalam bentuk Data URL.

Portal kemudian menampilkan QR Code dan memperbarui status koneksi.

## 16. Logging

Aplikasi menggunakan:

- Winston
- winston-daily-rotate-file
- Morgan

Log disimpan pada:

```text
logs/app-YYYY-MM.log
logs/error-YYYY-MM.log
```

Konfigurasi:

| Log | Retensi |
|---|---|
| Application | 12 bulan |
| Error | 24 bulan |
| Max size | 50 MB |

Rotasi menggunakan format:

```text
YYYY-MM
```

### HTTP Logger

Konfigurasi:

```env
HTTP_LOGGER=console
```

Pilihan:

| Mode | Perilaku |
|---|---|
| `console` | File + console |
| `file` | File saja |
| `off` | Nonaktif |

Format:

```text
METHOD URL STATUS RESPONSE_TIME
```

Contoh:

```text
POST /send-message 200 125.123 ms
```

### Console Logger

Untuk mengaktifkan output Winston ke console:

```env
LOG_CONSOLE=true
```

Untuk mematikannya:

```env
LOG_CONSOLE=false
```

## 17. Deployment dengan PM2

PM2 dapat digunakan untuk menjaga service tetap berjalan.

Install:

```bash
npm install -g pm2
```

Start:

```bash
pm2 start App.js --name wa-api
```

Cek status:

```bash
pm2 status
```

Cek log:

```bash
pm2 logs wa-api
```

Restart:

```bash
pm2 restart wa-api
```

Simpan konfigurasi:

```bash
pm2 save
```

Aktifkan startup saat boot:

```bash
pm2 startup
```

## 18. Reverse Proxy dengan Apache/Nginx

Untuk production, service Node.js dapat berjalan pada port internal, misalnya:

```text
127.0.0.1:5000
```

Kemudian Apache atau Nginx digunakan sebagai reverse proxy:

```text
Internet
   │
   ▼
HTTPS :443
   │
   ▼
Reverse Proxy
   │
   ▼
Node.js :5000
   │
   ▼
WhatsApp Web JS
```

Dengan pendekatan ini, API dapat diakses menggunakan domain HTTPS tanpa mengekspos port Node.js secara langsung.

## 19. Troubleshooting

### QR Code tidak muncul

Periksa:

```bash
pm2 logs wa-api
```

Cari:

```text
QR RECEIVED
```

Pastikan server dapat mengakses internet dan Puppeteer dapat menjalankan Chromium.

### `Not Authorized`

Pastikan header:

```http
Authorization: Basic <base64(API_USER:API_PASSWORD)>
```

sesuai dengan `.env`.

### Nomor tidak terdaftar

Periksa nomor tujuan.

Format:

```text
081234567890
```

akan dinormalisasi menjadi:

```text
6281234567890@c.us
```

### Callback gagal

Periksa:

- `APP_URL`.
- endpoint `/mom_status/...`.
- field `id`.
- koneksi server ke aplikasi tujuan.
- kredensial Basic Authentication.

### Gemini tidak merespons

Periksa:

```env
API_KEY=your-valid-key
```

Kemudian lihat:

```text
logs/error-YYYY-MM.log
```

### WhatsApp disconnected

Periksa log:

```bash
pm2 logs wa-api
```

Cari:

```text
AUTHENTICATION FAILURE
```

atau:

```text
Client was logged out
```

Dalam kondisi tertentu, sesi WhatsApp dapat membutuhkan scan QR kembali.

## 20. Security Checklist

Untuk production:

- Gunakan HTTPS.
- Jangan commit `.env`.
- Gunakan password API yang kuat.
- Jangan expose API key Google Gemini.
- Batasi akses port Node.js.
- Gunakan reverse proxy.
- Pastikan folder session WhatsApp tidak dapat diakses publik.
- Batasi permission folder `logs`.
- Pertimbangkan rate limiting.
- Validasi ukuran dan tipe file upload.
- Jangan menampilkan credential pada log production.
- Lakukan backup/monitoring session sesuai kebutuhan operasional.

## 21. API Flow

### Pengiriman pesan

```text
Client Application
       │
       │ POST /send-message
       │ Authorization: Basic ...
       ▼
   Express API
       │
       ├── Validate request
       │
       ├── Normalize number
       │
       ├── Check registered user
       │
       └── WhatsApp Web JS
                │
                ▼
        WhatsApp Message
                │
                ▼
       Callback APP_URL/mom_status/...
```

### Autentikasi WhatsApp

```text
Browser
   │
   │ GET /
   ▼
Authentication Portal
   │
   │ Socket.IO
   ▼
WhatsApp Client
   │
   │ QR event
   ▼
QR Code
   │
   │ Scan with phone
   ▼
Authenticated Session
```

## 22. Development Notes

Saat ini `App.js` menangani beberapa tanggung jawab sekaligus:

- Express configuration.
- WhatsApp client.
- WhatsApp event handler.
- API routes.
- Google Gemini.
- Callback.
- User profile lookup.
- Socket.IO.

Untuk pengembangan lebih lanjut, struktur dapat direfactor menjadi:

```text
src/
├── app.js
├── routes/
│   ├── health.js
│   ├── message.js
│   └── whatsapp.js
├── services/
│   ├── whatsapp.js
│   ├── callback.js
│   └── ai.js
├── middleware/
│   └── auth.js
├── helpers/
│   └── formatter.js
└── utils/
    ├── logger.js
    └── httpLogger.js
```

Struktur di atas adalah rekomendasi refactoring dan bukan struktur repository saat ini.

## 23. Lisensi

Repository mendeklarasikan lisensi:

```text
MIT
```

## 24. Referensi

- Repository: https://github.com/adityapeen/wa-api
- whatsapp-web.js: https://github.com/pedroslopez/whatsapp-web.js
- Express: https://expressjs.com/
- Socket.IO: https://socket.io/
- Google AI: https://ai.google.dev/
- Puppeteer: https://pptr.dev/
