const { getAll, getOne, runQuery } = require('../database/db');

const normalizeUnit = (unit) => {
  if (unit === 't') return 'qop';
  if (unit === 'liter') return 'litr';
  return unit;
};

const normalizePieceWeight = (unit, pieceWeight) => {
  const next = Number(pieceWeight);
  // Dona yoki paket bo'lsa ham, agar vazni kiritilgan bo'lsa o'shani olamiz, aks holda 1
  return Number.isFinite(next) && next > 0 ? next : 1;
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await getAll('SELECT * FROM products ORDER BY name');
    res.json(products);
  } catch (error) {
    console.error('Mahsulotlarni olishda xatolik:', error);
    res.status(500).json({ error: "Mahsulotlarni olib bo'lmadi" });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }
    res.json(product);
  } catch (error) {
    console.error('Mahsulotni olishda xatolik:', error);
    res.status(500).json({ error: "Mahsulotni olib bo'lmadi" });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { name, unit, purchase_price, quantity, piece_weight_kg } = req.body;
    const normalizedUnit = normalizeUnit(unit);

    if (!name || !normalizedUnit || !purchase_price) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }

    const nextPieceWeight = normalizePieceWeight(normalizedUnit, piece_weight_kg);

    const result = await runQuery(
      'INSERT INTO products (name, unit, purchase_price, quantity, piece_weight_kg) VALUES (?, ?, ?, ?, ?)',
      [name, normalizedUnit, purchase_price, quantity || 0, nextPieceWeight]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      unit: normalizedUnit,
      purchase_price,
      quantity: quantity || 0,
      piece_weight_kg: nextPieceWeight,
      message: 'Mahsulot muvaffaqiyatli yaratildi'
    });
  } catch (error) {
    if (error.message.includes('NOYOB cheklovi bajarilmadi')) {
      return res.status(400).json({ error: 'Bu nomdagi mahsulot allaqachon mavjud' });
    }
    console.error('Mahsulot yaratishda xatolik:', error);
    res.status(500).json({ error: 'Mahsulot yaratilmadi' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { name, unit, purchase_price, quantity, piece_weight_kg } = req.body;
    const { id } = req.params;

    const product = await getOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    const nextUnit = normalizeUnit(unit || product.unit);
    const nextPieceWeightRaw = piece_weight_kg !== undefined ? piece_weight_kg : product.piece_weight_kg;
    const nextPieceWeight = normalizePieceWeight(nextUnit, nextPieceWeightRaw);

    await runQuery(
      'UPDATE products SET name = ?, unit = ?, purchase_price = ?, quantity = ?, piece_weight_kg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        name || product.name,
        nextUnit,
        purchase_price || product.purchase_price,
        quantity !== undefined ? quantity : product.quantity,
        nextPieceWeight,
        id,
      ]
    );

    res.json({ message: 'Mahsulot muvaffaqiyatli yangilandi' });
  } catch (error) {
    console.error('Mahsulotni yangilashda xatolik yuz berdi:', error);
    res.status(500).json({ error: 'Mahsulot yangilanmadi' });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getOne('SELECT * FROM products WHERE id = ?', [id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    await runQuery('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: "Mahsulot muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Mahsulotni o'chirishda xatolik yuz berdi:", error);
    res.status(500).json({ error: "Mahsulot oʻchirilmadi" });
  }
};

// Get product inventory
const getInventory = async (req, res) => {
  try {
    const inventory = await getAll(`
      SELECT
        p.id,
        p.name,
        p.unit,
        p.purchase_price,
        p.quantity,
        p.piece_weight_kg,
        COALESCE(u.total_used, 0) as total_used,
        COALESCE(w.total_wasted, 0) as total_wasted,
        -- Dona/birlikdagi qoldiq
        (p.quantity - (COALESCE(u.total_used, 0) / p.piece_weight_kg) - (COALESCE(w.total_wasted, 0) / p.piece_weight_kg)) as remaining,
        -- Jami qiymat: Qoldiq (kg/litr) * narxi (Dashboard mantiqi bilan bir xil)
        ((p.quantity * p.piece_weight_kg - COALESCE(u.total_used, 0) - COALESCE(w.total_wasted, 0)) * p.purchase_price) as remaining_value
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity_used) as total_used
        FROM daily_logs
        GROUP BY product_id
      ) u ON u.product_id = p.id
      LEFT JOIN (
        SELECT product_id, SUM(quantity_wasted) as total_wasted
        FROM wastage
        GROUP BY product_id
      ) w ON w.product_id = p.id
      ORDER BY p.name
    `);
    res.json(inventory);
  } catch (error) {
    console.error('Inventarizatsiyani olishda xatolik:', error);
    res.status(500).json({ error: 'Inventarizatsiyani olishda xatolik yuz berdi' });
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory
};
