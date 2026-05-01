const { getAll, getOne, runQuery } = require('../database/db');

const getWastage = async (req, res) => {
  try {
    const rows = await getAll(
      `
        SELECT
          w.*,
          p.name as product_name,
          p.unit as product_unit,
          p.piece_weight_kg
        FROM wastage w
        JOIN products p ON p.id = w.product_id
        ORDER BY w.date DESC, w.created_at DESC
      `
    );
    res.json(rows);
  } catch (error) {
    console.error("Yo'qotishlarni olishda xatolik:", error);
    res.status(500).json({ error: "Yo'qotishlarni olib bo'lmadi" });
  }
};

const getWastageByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const rows = await getAll(
      `
        SELECT
          w.*,
          p.name as product_name,
          p.unit as product_unit,
          p.piece_weight_kg
        FROM wastage w
        JOIN products p ON p.id = w.product_id
        WHERE w.date = ?
        ORDER BY w.created_at DESC
      `,
      [date]
    );
    res.json(rows);
  } catch (error) {
    console.error("Yo'qotishlarni sana bo'yicha olishda xatolik:", error);
    res.status(500).json({ error: "Yo'qotishlarni olib bo'lmadi" });
  }
};

const createWastage = async (req, res) => {
  try {
    const { product_id, quantity_wasted, reason, date } = req.body;
    if (!product_id || quantity_wasted === undefined || !date) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }

    const product = await getOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

    const result = await runQuery(
      'INSERT INTO wastage (product_id, quantity_wasted, reason, date) VALUES (?, ?, ?, ?)',
      [product_id, quantity_wasted, reason || '', date]
    );

    res.status(201).json({ id: result.lastID, message: "Yo'qotishlar muvaffaqiyatli yaratildi" });
  } catch (error) {
    console.error("Yo'qotishlarni yaratishda xatolik:", error);
    res.status(500).json({ error: "Yo'qotishlar yaratilmadi" });
  }
};

const updateWastage = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM wastage WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: "Yo'qotishlar topilmadi" });

    const { product_id, quantity_wasted, reason, date } = req.body;

    await runQuery(
      `
        UPDATE wastage
        SET product_id = ?, quantity_wasted = ?, reason = ?, date = ?
        WHERE id = ?
      `,
      [
        product_id ?? existing.product_id,
        quantity_wasted ?? existing.quantity_wasted,
        reason ?? existing.reason,
        date ?? existing.date,
        id,
      ]
    );

    res.json({ message: "Yo'qotishlar muvaffaqiyatli yangilandi" });
  } catch (error) {
    console.error("Yo'qotishlarni yangilashda xatolik:", error);
    res.status(500).json({ error: "Yo'qotishlarni yangilashda xatolik yuz berdi" });
  }
};

const deleteWastage = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM wastage WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: "Yo'qotishlar topilmadi" });

    await runQuery('DELETE FROM wastage WHERE id = ?', [id]);
    res.json({ message: "Yo'qotishlar muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Yo'qotishlarni o'chirishda xatolik:", error);
    res.status(500).json({ error: "Yo'qotishlarni o'chirib bo'lmadi" });
  }
};

module.exports = {
  getWastage,
  getWastageByDate,
  createWastage,
  updateWastage,
  deleteWastage,
};
