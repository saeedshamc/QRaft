# QRaft - Professional Custom QR Code Generator

QRaft is a high-performance, fully featured, single-page application for generating and scanning customized, pixel-perfect QR codes. Built using React, TypeScript, and Tailwind CSS, the app is optimized for both desktop precision and mobile speed, providing real-time canvas-based styling and robust batch-processing tools.

---

## 🚀 Key Features

### 🎨 Advanced Aesthetic Customization
- **Dynamic Gradient Mode**: Replace solid foreground colors with beautiful, custom-defined linear gradients (Start Color & End Color). The gradient renders natively in real-time across both canvas previews and exported formats.
- **Center Logo Overlays**: Upload customized center logos (`.png`, `.svg`) with adjustable scaling margins to safely position your branding at the core of the QR code.
- **Watermark Overlays**: Overlay an elegant text watermark in the bottom-right corner of your QR code with configurable opacity sliders—perfect for labels, verification stamps, or security tags.
- **Adaptive Frames & Labels**: Choose from several designer frames ("Scan Me", "Website", "Contact") with colors and text dynamic to your current palette configuration.
- **Dot Styles**: Swap between standard `Square`, soft `Rounded`, or playful `Dots` module patterns.

### 📦 Robust Batch Processing & History
- **Excel/CSV Integration**: Import lists of data in bulk using customizable spreadsheet layouts. Columns support content fields, optional filenames, custom labels, and center logo URLs.
- **Durable Download History**: Built-in IndexedDB storage records your batch downloads. Re-download generated `.zip` packages from your last 5 batch-generation sessions instantly—fully stored locally and client-safe.
- **Generation Delays**: Configurable delays between code generation loops prevent browser thread locking and ensure smooth execution even for heavy loads.

### 🌐 Dual-Language Support (English & Farsi/فارسی)
- Beautifully translated, localized interface utilizing appropriate typography and RTL (Right-to-Left) direction setups when switching between English and Persian.

---

## 🛠️ Built With

- **Framework**: [React 18+](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) for type safety.
- **Build System**: [Vite](https://vitejs.dev/) for instant HMR-free preview speed.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a sleek, dark-friendly responsive user experience.
- **QR Engine**: `qrcode` library mapped into a customized Canvas render pipeline for watermark and gradient injection.
- **Bulk Processing**: `JSZip` to bundle bulk high-resolution QR codes in the browser.
- **Offline Storage**: HTML5 IndexedDB API for durable, session-persistent batch log archives.

---

## 📥 Getting Started

### Installation
Ensure you have [Node.js](https://nodejs.org/) installed, then run:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 🇮🇷 راهنمای کاربری به زبان فارسی

**کیوارافت (QRaft)** یک ابزار فوق‌العاده حرفه‌ای و سریع برای تولید و اسکن کدهای کیوآر سفارشی است. با امکانات ویژه جدید، طرح‌های خود را متمایز کنید:

### 🌟 ویژگی‌های برجسته:
1. **حالت گرادینت رنگی (طیف رنگ)**: انتخاب رنگ شروع و پایان برای الگوی کد QR به جای رنگ‌های ساده و تکراری تک‌رنگ.
2. **واترمارک متنی اختصاصی**: درج متن دلخواه در گوشه سمت راست پایین تصویر کد با قابلیت تنظیم شفافیت.
3. **تاریخچه دانلودهای گروهی (بسته‌ها)**: ذخیره‌سازی ابری و محلی آخرین ۵ بسته زیپ تولید شده با استفاده از تکنولوژی پیشرفته IndexedDB جهت بازیابی و دانلود مجدد سریع.
4. **ترجمه و بومی‌سازی کامل فارسی**: پنل کاملاً فارسی و روان همگام با استانداردهای RTL راست‌چین.
