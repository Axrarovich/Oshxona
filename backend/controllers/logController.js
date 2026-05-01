const { getAll, getOne, runQuery } = require('../database/db');

const getLogs = async (req, res) => {
  try {
    const logs = await getAll(
      `
        SELECT
          l.*,
          p.name as product_name,
          p.unit as unit,
          r.name as recipe_name
        FROM daily_logs l
        JOIN products p ON p.id = l.product_id
        LEFT JOIN recipes r ON r.id = l.recipe_id
        ORDER BY l.date DESC, l.created_at DESC
      `
    );
    res.json(logs);
  } catch (error) {
    console.error('Jurnallarni olishda xatolik:', error);
    res.status(500).json({ error: 'Jurnallarni olishda xatolik yuz berdi' });
  }
};

const getLogsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const logs = await getAll(
      `
        SELECT
          l.*,
          p.name as product_name,
          p.unit as unit,
          r.name as recipe_name
        FROM daily_logs l
        JOIN products p ON p.id = l.product_id
        LEFT JOIN recipes r ON r.id = l.recipe_id
        WHERE l.date = ?
        ORDER BY l.created_at DESC
      `,
      [date]
    );
    res.json(logs);
  } catch (error) {
    console.error("Jurnallarni sana bo'yicha olishda xatolik:", error);
    res.status(500).json({ error: 'Jurnallarni olishda xatolik yuz berdi' });
  }
};

const getLogsByConsumptionId = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await getAll(
      `
        SELECT
          l.*,
          p.name as product_name,
          p.unit as unit,
          p.piece_weight_kg
        FROM daily_logs l
        JOIN products p ON p.id = l.product_id
        WHERE l.consumption_id = ?
        ORDER BY p.name
      `,
      [id]
    );
    res.json(logs);
  } catch (error) {
    console.error("Iste'mol bo'yicha jurnallarni olishda xatolik:", error);
    res.status(500).json({ error: 'Maʼlumotlarni olishda xatolik yuz berdi' });
  }
};

const createLog = async (req, res) => {
  try {
    const { product_id, quantity_used, recipe_id, date, notes } = req.body;
    if (!product_id || !quantity_used || !date) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }

    const product = await getOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

    const result = await runQuery(
      'INSERT INTO daily_logs (product_id, quantity_used, recipe_id, date, notes) VALUES (?, ?, ?, ?, ?)',
      [product_id, quantity_used, recipe_id || null, date, notes || '']
    );

    res.status(201).json({ id: result.lastID, message: 'Jurnal muvaffaqiyatli yaratildi' });
  } catch (error) {
    console.error('Jurnal yaratishda xatolik:', error);
    res.status(500).json({ error: 'Jurnal yaratilmadi' });
  }
};

const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await getOne('SELECT * FROM daily_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: 'Jurnal topilmadi' });

    await runQuery('DELETE FROM daily_logs WHERE id = ?', [id]);
    res.json({ message: "Jurnal muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Jurnalni o'chirishda xatolik:", error);
    res.status(500).json({ error: "Jurnalni oʻchirishda xatolik yuz berdi" });
  }
};

module.exports = {
  getLogs,
  getLogsByDate,
  getLogsByConsumptionId,
  createLog,
  deleteLog,
};
