# ساخت APK حجم‌سنج (Capacitor)

این پروژه همان برنامه‌ی وب است؛ فونت (Vazirmatn) و لوگو داخل بسته قرار گرفته‌اند و برنامه آفلاین هم کار می‌کند.
پوشه‌ی `android/` از قبل ساخته شده است.

## پیش‌نیاز (یک بار)
- Node.js 20 یا بالاتر
- Android Studio (همراه با Android SDK و JDK 17+)

## ساخت APK
```bash
npm install
npm run android:sync     # بیلد وب و کپی در پروژه‌ی اندروید
npm run android:open     # باز شدن پروژه در Android Studio
```
در Android Studio: **Build ▸ Generate Signed Bundle / APK ▸ APK**
- اگر keystore ندارید، گزینه‌ی *Create new…* را بزنید.
- **فایل keystore و رمزها را جای امن نگه دارید**؛ بدون آن نمی‌توانید به‌روزرسانی منتشر کنید.
- نوع بیلد را **release** بگذارید. خروجی در `android/app/release/` است.

برای تست سریع روی گوشی (بدون امضای نهایی): **Run ▸ Run 'app'** با گوشی متصل (USB debugging).

## قبل از انتشار در بازار / مایکت
1. **لوگوی اصلی:** فایل `src/assets/brand.png` فعلاً از اسکرین‌شات بریده شده و کیفیتش پایین است.
   فایل PNG اصلی را جایگزینش کنید (و همان را برای آیکون برنامه هم بگذارید: `assets/icon-only.png`، حداقل ۱۰۲۴×۱۰۲۴).
2. ساخت دوباره‌ی آیکون‌ها: `npm run android:icons`
3. شناسه‌ی برنامه (`appId`) در `capacitor.config.ts` است (فعلاً `ir.hajmsanj.app`). قبل از اولین انتشار به مقدار یکتای خودتان تغییر بدهید؛ بعد از انتشار دیگر نباید عوض شود.
4. نسخه‌ی برنامه: `versionCode` و `versionName` در `android/app/build.gradle` (با هر انتشار جدید `versionCode` را زیاد کنید).
5. بعد از هر تغییر در کد وب: `npm run android:sync` و بیلد دوباره.
