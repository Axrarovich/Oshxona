const { getAll } = require('../database/db');

const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const products = await getAll(
      `
        SELECT
          p.id,
          p.name,
          p.unit,
          p.piece_weight_kg,
          -- Boshlang'ich umumiy miqdor (kg, litr yoki dona)
          ROUND(p.quantity * p.piece_weight_kg - COALESCE(ub.used_before, 0) - COALESCE(wb.wasted_before, 0), 3) as quantity,
          ROUND(COALESCE(ut.used_today, 0), 3) as used_today,
          ROUND(COALESCE(wt.wasted_today, 0), 3) as wasted_today
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity_used) as used_before
          FROM daily_logs
          WHERE date(date) < date(?)
          GROUP BY product_id
        ) ub ON ub.product_id = p.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_wasted) as wasted_before
          FROM wastage
          WHERE date(date) < date(?)
          GROUP BY product_id
        ) wb ON wb.product_id = p.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_used) as used_today
          FROM daily_logs
          WHERE date(date) = date(?)
          GROUP BY product_id
        ) ut ON ut.product_id = p.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_wasted) as wasted_today
          FROM wastage
          WHERE date(date) = date(?)
          GROUP BY product_id
        ) wt ON wt.product_id = p.id
        ORDER BY p.name
      `,
      [date, date, date, date]
    );

    const consumption = await getAll(
      `
        SELECT
          c.*,
          r.name as recipe_name
        FROM consumption c
        JOIN recipes r ON r.id = c.recipe_id
        WHERE date(c.date) = date(?)
        ORDER BY c.created_at DESC
      `,
      [date]
    );

    res.json({ date, products, consumption });
  } catch (error) {
    console.error('Kundalik hisobotni olishda xatolik:', error);
    res.status(500).json({ error: 'Kundalik hisobotni olishda xatolik yuz berdi' });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const year = String(req.query.year || new Date().getFullYear());
    const monthNum = parseInt(req.query.month || new Date().getMonth() + 1, 10);
    const month = String(monthNum).padStart(2, '0');
    const period = `${year}-${month}`;

    const daily_summary = await getAll(
      `
        SELECT
          c.id as consumption_id,
          c.date as day,
          c.meal_type,
          r.name as recipe_name,
          c.expected_people,
          c.notes
        FROM consumption c
        LEFT JOIN recipes r ON r.id = c.recipe_id
        WHERE strftime('%Y', c.date) = ? AND strftime('%m', c.date) = ?
        ORDER BY c.date, c.meal_type
      `,
      [year, month]
    );

    const expenses = await getAll(
      `
        SELECT
          type,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM expenses
        WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
        GROUP BY type
        ORDER BY total_amount DESC
      `,
      [year, month]
    );

    res.json({ period, daily_summary, expenses });
  } catch (error) {
    console.error('Oylik hisobotni olishda xatolik:', error);
    res.status(500).json({ error: 'Oylik hisobotni olishda xatolik yuz berdi' });
  }
};

const getInventoryReport = async (req, res) => {
  try {
    const inventory = await getAll(
      `
        SELECT
          p.id,
          p.name,
          p.unit,
          p.purchase_price,
          p.piece_weight_kg,
          -- Umumiy qoldiq (kg, litr yoki dona)
          ROUND(p.quantity * p.piece_weight_kg - COALESCE(u.total_used, 0) - COALESCE(w.total_wasted, 0), 3) as remaining,
          -- Qiymatni hisoblash: jami kg * narxi
          ROUND((p.quantity * p.piece_weight_kg - COALESCE(u.total_used, 0) - COALESCE(w.total_wasted, 0)) * p.purchase_price, 2) as remaining_value
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
      `
    );

    const summary = inventory.reduce(
      (acc, item) => {
        acc.total_value += Number(item.remaining_value || 0);
        return acc;
      },
      { total_value: 0 }
    );

    res.json({ summary, inventory });
  } catch (error) {
    console.error('Hisob-kitobni olishda xatolik:', error);
    res.status(500).json({ error: 'Hisob-kitobni olishda xatolik yuz berdi' });
  }
};

const getConsumptionStats = async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days || 30, 10));
    const since = `-${days} days`;

    const stats = await getAll(
      `
        SELECT
          date,
          meal_type,
          SUM(expected_people) as total_expected,
          SUM(COALESCE(actual_people, 0)) as total_actual,
          SUM(COALESCE(leftovers, 0)) as total_leftovers,
          CASE
            WHEN SUM(expected_people) > 0
              THEN ROUND((SUM(COALESCE(actual_people, 0)) * 100.0) / SUM(expected_people), 0)
            ELSE 0
          END as attendance_percentage
        FROM consumption
        WHERE date(date) >= date('now', ?)
        GROUP BY date, meal_type
        ORDER BY date DESC, meal_type
      `,
      [since]
    );

    res.json({ period_days: days, stats });
  } catch (error) {
    console.error("Iste'mol statistikasini olishda xatolik:", error);
    res.status(500).json({ error: "Isteʼmol statistikasini olishda xatolik yuz berdi" });
  }
};

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getInventoryReport,
  getConsumptionStats,
};
