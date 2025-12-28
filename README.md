<div align="center">

# Komikkuya

<img src="https://raw.githubusercontent.com/konakun2/Komikkuya/main/src/assets/og-image.png" alt="Komikkuya Banner" width="600"/>

### Situs Baca Komik Gratis Online Terlengkap

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![EJS](https://img.shields.io/badge/EJS-Template-B4CA65?style=for-the-badge&logo=ejs&logoColor=white)](https://ejs.co/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[![Website](https://img.shields.io/website?style=for-the-badge&url=https%3A%2F%2Fkomikkuya.my.id)](https://komikkuya.my.id)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[Demo](https://komikkuya.my.id) | [Report Bug](https://github.com/konakun2/Komikkuya/issues) | [Request Feature](https://github.com/konakun2/Komikkuya/issues)

</div>

---

## Tentang Project

Komikkuya adalah platform baca komik online gratis yang menyediakan koleksi lengkap manga, manhwa, dan manhua dengan update harian. Dibangun dengan fokus pada kecepatan, SEO, dan pengalaman pengguna yang optimal.

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-Source** | Mendukung manga, manhwa, manhua, doujin, dan nhentai |
| **SEO Optimized** | Schema.org, Open Graph, sitemap dinamis |
| **PWA Ready** | Bisa diinstall di perangkat mobile |
| **Responsive** | Tampilan optimal di semua ukuran layar |
| **No Ads** | Bebas iklan, loading cepat |
| **Dark Mode** | Tema gelap yang nyaman untuk mata |

---

## Tech Stack

<table>
<tr>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=nodejs" width="48" height="48" alt="Node.js" />
<br>Node.js
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=express" width="48" height="48" alt="Express" />
<br>Express
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=vercel" width="48" height="48" alt="Vercel" />
<br>Vercel
</td>
</tr>
</table>

---

## Getting Started

### Prerequisites

- Node.js 18 atau lebih baru
- npm atau yarn

### Installation

```bash
# Clone repository
git clone https://github.com/konakun2/Komikkuya.git

# Masuk ke direktori
cd Komikkuya

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Server akan berjalan di `http://localhost:9123`

---

## Project Structure

```
Komikkuya/
├── src/
│   ├── assets/           # Static assets (images, icons)
│   ├── controllers/      # Route controllers
│   ├── public/           # Public files (robots.txt, manifest.json)
│   ├── routes/           # Express routes
│   └── views/            # EJS templates
│       ├── layouts/      # Layout templates
│       ├── manga/        # Manga pages
│       ├── doujin/       # Doujin pages
│       └── nhentai/      # Nhentai pages
├── package.json
└── vercel.json           # Vercel deployment config
```

---

## SEO Features

Komikkuya dilengkapi dengan fitur SEO lengkap untuk mendukung indexing di search engine:

- **Meta Tags** - Title, description, keywords yang dioptimasi
- **Open Graph** - Preview yang optimal untuk Facebook dan sosial media
- **Twitter Cards** - Preview khusus untuk Twitter
- **JSON-LD Schema** - WebSite, Organization, ComicSeries, BreadcrumbList
- **Dynamic Sitemap** - Sitemap.xml yang generate otomatis dari API
- **robots.txt** - Instruksi untuk search engine crawlers
- **Canonical URLs** - Mencegah duplicate content
- **PWA Manifest** - Support untuk Progressive Web App

---

## API Source

Komikkuya menggunakan API dari:
- [Komiku API](https://komiku-api-self.vercel.app) - Manga, manhwa, manhua
- Custom API - Doujin dan nhentai content

---

## Deployment

Project ini sudah dikonfigurasi untuk deployment di Vercel:

```bash
# Deploy ke Vercel
vercel --prod
```

Atau connect repository GitHub langsung ke Vercel untuk automatic deployment.

---

## Contributing

Kontribusi sangat diterima. Untuk perubahan besar, silakan buka issue terlebih dahulu untuk mendiskusikan perubahan yang diinginkan.

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Contact

- Website: [komikkuya.my.id](https://komikkuya.my.id)
- GitHub: [@ItzApipAjalah](https://github.com/ItzApipAjalah)

---

<div align="center">

Made with passion by **Komikkuya Team**

[![Stars](https://img.shields.io/github/stars/konakun2/Komikkuya?style=social)](https://github.com/konakun2/Komikkuya)
[![Forks](https://img.shields.io/github/forks/konakun2/Komikkuya?style=social)](https://github.com/konakun2/Komikkuya)

</div>
