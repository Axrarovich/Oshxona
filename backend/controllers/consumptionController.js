const { getAll, getOne, runQuery } = require('../database/db');

const getConsumption = async (req, res) => {
  try {
    const rows = await getAll(
      `
        SELECT
          c.*,
          r.name as recipe_name
        FROM consumption c
        JOIN recipes r ON r.id = c.recipe_id
        ORDER BY c.date DESC, c.created_at DESC
      `
    );
    res.json(rows);
  } catch (error) {
    console.error('Isteʼmolni olishda xatolik:', error);
    res.status(500).json({ error: 'Isteʼmolni olishda xatolik yuz berdi' });
  }
};

const getConsumptionByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const rows = await getAll(
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
    res.json(rows);
  } catch (error) {
    console.error("Sana bo'yicha iste'molni olishda xatolik:", error);
    res.status(500).json({ error: 'Isteʼmolni olishda xatolik yuz berdi' });
  }
};

const createConsumption = async (req, res) => {
  try {
    const { recipe_id, meal_type, date, expected_people, notes } = req.body;
    if (!recipe_id || !meal_type || !date || expected_people === undefined) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }

    const recipe = await getOne('SELECT id FROM recipes WHERE id = ?', [recipe_id]);
    if (!recipe) return res.status(404).json({ error: 'Retsept topilmadi' });

    // Iste'molni yaratish
    const result = await runQuery(
      `
        INSERT INTO consumption (recipe_id, meal_type, date, expected_people, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        recipe_id,
        meal_type,
        date,
        expected_people,
        notes || '',
      ]
    );

    const consumptionId = result.lastID;

    // Retsept mahsulotlarini olish va jurnallarga (daily_logs) yozish
    const recipeItems = await getAll(
      `
        SELECT ri.*, p.piece_weight_kg 
        FROM recipe_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.recipe_id = ?
      `, 
      [recipe_id]
    );

    for (const item of recipeItems) {
      let quantityUsed = Number(item.quantity_needed) * Number(expected_people);
      const weight = Number(item.piece_weight_kg) || 1;
      const unit = (item.unit || '').toLowerCase().trim();
      
      if (unit === 'g' || unit === 'gramm' || unit === 'ml') {
        quantityUsed = quantityUsed / 1000;
      } else if (unit === 'dona' || unit === 'paket') {
        quantityUsed = quantityUsed * weight;
      }
      
      if (quantityUsed > 0) {
        await runQuery(
          `
            INSERT INTO daily_logs (product_id, quantity_used, recipe_id, consumption_id, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            item.product_id,
            quantityUsed,
            recipe_id,
            consumptionId,
            date,
            `Iste'mol: ${meal_type} (avtomatik)`
          ]
        );
      }
    }

    res.status(201).json({ id: consumptionId, message: "Iste'mol muvaffaqiyatli yaratildi" });
  } catch (error) {
    console.error("Iste'molni yaratishda xatolik:", error);
    res.status(500).json({ error: 'Isteʼmol yaratilmadi' });
  }
};

const updateConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM consumption WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: "Iste'mol topilmadi" });

    const { recipe_id, meal_type, date, expected_people, notes } = req.body;

    const newRecipeId = recipe_id ?? existing.recipe_id;
    const newExpectedPeople = expected_people ?? existing.expected_people;
    const newDate = date ?? existing.date;
    const newMealType = meal_type ?? existing.meal_type;

    await runQuery(
      `
        UPDATE consumption
        SET recipe_id = ?, meal_type = ?, date = ?, expected_people = ?, notes = ?
        WHERE id = ?
      `,
      [
        newRecipeId,
        newMealType,
        newDate,
        newExpectedPeople,
        notes ?? existing.notes,
        id,
      ]
    );

    // Eskilarini o'chirib, yangilarini kiritamiz
    await runQuery('DELETE FROM daily_logs WHERE consumption_id = ?', [id]);

    const recipeItems = await getAll(
      `
        SELECT ri.*, p.piece_weight_kg 
        FROM recipe_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.recipe_id = ?
      `, 
      [newRecipeId]
    );

    for (const item of recipeItems) {
      let quantityUsed = Number(item.quantity_needed) * Number(newExpectedPeople);
      const weight = Number(item.piece_weight_kg) || 1;
      const unit = (item.unit || '').toLowerCase().trim();

      if (unit === 'g' || unit === 'gramm' || unit === 'ml') {
        quantityUsed = quantityUsed / 1000;
      } else if (unit === 'dona' || unit === 'paket') {
        quantityUsed = quantityUsed * weight;
      }

      if (quantityUsed > 0) {
        await runQuery(
          `
            INSERT INTO daily_logs (product_id, quantity_used, recipe_id, consumption_id, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            item.product_id,
            quantityUsed,
            newRecipeId,
            id,
            newDate,
            `Iste'mol: ${newMealType} (tahrirlandi)`
          ]
        );
      }
    }

    res.json({ message: "Iste'mol muvaffaqiyatli yangilandi" });
  } catch (error) {
    console.error("Iste'molni yangilashda xatolik yuz berdi:", error);
    res.status(500).json({ error: "Isteʼmolni yangilashda xatolik yuz berdi" });
  }
};

const deleteConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM consumption WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: "Iste'mol topilmadi" });

    await runQuery('DELETE FROM daily_logs WHERE consumption_id = ?', [id]);
    await runQuery('DELETE FROM consumption WHERE id = ?', [id]);
    res.json({ message: "Iste'mol muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Iste'molni o'chirishda xatolik:", error);
    res.status(500).json({ error: "Isteʼmolni oʻchirishda xatolik yuz berdi" });
  }
};

module.exports = {
  getConsumption,
  getConsumptionByDate,
  createConsumption,
  updateConsumption,
  deleteConsumption,
};
