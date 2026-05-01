# Project Summary

`km_oshxona` — oshxona (zavod oshxonasi) uchun inventar, retsept, kunlik log, iste'mol, isrof va hisobotlarni yuritish tizimi.

## Stack
- Backend: Node.js + Express + SQLite
- Frontend: React (CRA) + axios

## API (asosiy)
- `GET /api/products`, `GET /api/products/inventory`
- `GET /api/recipes`, `GET /api/recipes/:id`, `POST /api/recipes/items`
- `GET /api/logs/:date`, `POST /api/logs`
- `GET /api/consumption/:date`, `POST /api/consumption`
- `GET /api/wastage/:date`, `POST /api/wastage`
- `GET /api/reports/daily?date=YYYY-MM-DD`
- `GET /api/reports/monthly?year=YYYY&month=MM`
- `GET /api/reports/inventory`
- `GET /api/reports/consumption-stats?days=N`

