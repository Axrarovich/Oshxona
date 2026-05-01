# Oshxona Boshqaruv Tizimi
# Factory Kitchen Management System

## Loyihaning tavsifi
Oshxona uchun to'liq boshqaruv tizimi. Mahsulotlarni, retseptlarni, kunlik xarajatlarni va ovqat tayyorlashni boshqarish.

## Features (Xususiyatlari)
- ✅ **Mahsulot inventari** - Oshxonaga keladigan barcha mahsulotlar
- ✅ **Retsept boshqaruvi** - Qaysi ovqat uchun qancha mahsulot
- ✅ **Kunlik log** - Har kuni ishlatiladigan mahsulotlar
- ✅ **Iste'molni kuzatish** - Necha kishiga tayyorlangan, necha kishi yedi, qancha qoldi
- ✅ **Ovqat turlari** - Nonushta, tushlik, kechki ovqatni ajratish
- ✅ **Isrof va tashkil etish** - Yo'qolgan/buzilgan mahsulotlar
- ✅ **Hisobotlar va tahlil** - Kirim-chiqim, qoldiqlar
- ✅ **Narx boshqaruvi** - Mahsulotlar narxi va umumiy kirim-chiqim

## Texnologiyalar
- **Backend:** Node.js + Express.js
- **Frontend:** React.js
- **Database:** SQLite3
- **Package Manager:** npm

## O'rnatish (Installation)

### Barcha paketlarni o'rnatish:
```bash
npm run install-all
```

### Faqat backend paketlarini o'rnatish:
```bash
cd backend
npm install
```

### Faqat frontend paketlarini o'rnatish:
```bash
cd frontend
npm install
```

## Ishga tushirish (Running)

### Ishlab chiqish rejimida (server va mijoz):
```bash
npm run dev
```

Yoki alohida:

### Backend server:
```bash
cd backend
npm start
```

### Frontend:
```bash
cd frontend
npm start
```

## Loyiha strukturasi
```
km_oshxona/
├── backend/           # Node.js + Express server
│   ├── routes/        # API yo'nalishlari
│   ├── models/        # Ma'lumotlar bazasi modellari
│   ├── controllers/   # Biznes mantiqi
│   ├── database/      # Ma'lumotlar bazasi sozlamalari
│   ├── middleware/    # Express o'rta dasturi
│   ├── server.js      # Asosiy server fayli
│   └── package.json
├── frontend/          # React ilovasi
│   ├── src/
│   │   ├── components/    # React komponentlari
│   │   ├── pages/         # Sahifa komponentlari
│   │   ├── services/      # API xizmatlari
│   │   ├── App.js         # Asosiy ilova komponenti
│   │   └── index.js       # Kirish nuqtasi
│   ├── public/
│   └── package.json
├── README.md          # Ushbu fayl
└── package.json       # Ildiz package.json
```

## API Endpoints (Asosiy)

### Mahsulotlar (Products)
- `GET /api/products` - Barcha mahsulotlar
- `POST /api/products` - Yangi mahsulot qo'shish
- `PUT /api/products/:id` - Mahsulotni tahrirlash
- `DELETE /api/products/:id` - Mahsulotni o'chirish

### Retseptlar (Recipes)
- `GET /api/recipes` - Barcha retseptlar
- `POST /api/recipes` - Yangi retsept
- `PUT /api/recipes/:id` - Retseptni tahrirlash
- `DELETE /api/recipes/:id` - Retseptni o'chirish

### Kunlik log (Daily Logs)
- `GET /api/logs` - Barcha loglar
- `POST /api/logs` - Yangi log qo'shish
- `GET /api/logs/:date` - Berilgan kunning loglari

### Iste'mol (Consumption)
- `GET /api/consumption` - Iste'mol ma'lumotlari
- `POST /api/consumption` - Yangi ma'lumot qo'shish
- `GET /api/consumption/:date` - Berilgan kunning iste'moli

### Hisobotlar (Reports)
- `GET /api/reports/daily` - Kunlik hisobot
- `GET /api/reports/monthly` - Oylik hisobot
- `GET /api/reports/summary` - Umumiy hisobot

## Database Schema (Ma'lumotlar bazasi sxemasi)

### Products (Mahsulotlar)
- id (PRIMARY KEY)
- name (mahsulot nomi)
- unit (birligi: kg, litr, dona, paket va hk)
- purchase_price (sotib olingan narxi)
- quantity (miqdori)
- created_at
- updated_at

### Recipes (Retseptlar)
- id (PRIMARY KEY)
- name (ovqat nomi)
- meal_type (nonushta/tushlik/kechki ovqat)
- description
- created_at

### Recipe_Items (Retsept tarkibi)
- id
- recipe_id (FOREIGN KEY)
- product_id (FOREIGN KEY)
- quantity_needed
- unit

### Daily_Logs (Kunlik loglar)
- id
- product_id (FOREIGN KEY)
- quantity_used
- recipe_id (FOREIGN KEY)
- date
- notes

### Consumption (Iste'mol)
- id
- recipe_id (FOREIGN KEY)
- meal_type
- date
- expected_people (mo'ljallangan kishi soni)
- actual_people (haqiqiy kishi soni)
- leftovers (ortib qolgan miqdor)

### Wastage (Isrof va tashkil etish)
- id
- product_id (FOREIGN KEY)
- quantity_wasted
- reason (sababi)
- date

### Expenses (Xarajatlar)
- id
- type (mahsulot sotib olish, boshqa)
- amount (summa)
- description
- date

## Foydalanish vazifalari

1. **Mahsulotlarni ro'yxatga olish** - Oshxonaga keladigan barcha mahsulotlarni qo'shish
2. **Retseptlarni yaratish** - Har bir ovqat uchun retsept va tarkibni belgilash
3. **Kunlik logni yuritish** - Har kuni qancha mahsulot ishlatilganini qayd etish
4. **Iste'molni qayd etish** - Necha kishi uchun tayyorlandi, necha kishi yedi, qancha qoldi
5. **Isrofni qayd etish** - Yo'qolgan yoki buzilgan mahsulotlarni kiritish
6. **Hisobotlarni ko'rish** - Kunlik, oylik tahlillar va umumiy ma'lumotlarni kuzatish
7. **Narx boshqaruvi** - Xarajatlarni nazorat qilish

## Litsenziya
MIT License
