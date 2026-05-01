const { getAll, getOne, runQuery } = require('../database/db');

const getAllRecipes = async (req, res) => {
  try {
    const recipes = await getAll('SELECT * FROM recipes ORDER BY name');
    res.json(recipes);
  } catch (error) {
    console.error('Retseptlarni olishda xatolik:', error);
    res.status(500).json({ error: 'Retseptlarni olishda xatolik yuz berdi' });
  }
};

const getRecipe = async (req, res) => {
  try {
    const recipe = await getOne('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
    if (!recipe) return res.status(404).json({ error: 'Retsept topilmadi' });

    const items = await getAll(
      `
        SELECT
          ri.id,
          ri.recipe_id,
          ri.product_id,
          p.name as product_name,
          ri.quantity_needed,
          ri.unit
        FROM recipe_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.recipe_id = ?
        ORDER BY p.name
      `,
      [req.params.id]
    );

    res.json({ ...recipe, items });
  } catch (error) {
    console.error('Retseptni olishda xatolik:', error);
    res.status(500).json({ error: 'Retseptni olishda xatolik yuz berdi' });
  }
};

const createRecipe = async (req, res) => {
  try {
    const { name, meal_type, description, items } = req.body;
    if (!name) return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });

    const result = await runQuery(
      'INSERT INTO recipes (name, meal_type, description) VALUES (?, ?, ?)',
      [name, meal_type || 'lunch', description || '']
    );

    const recipeId = result.lastID;

    // If items are provided, add them too
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await runQuery(
          'INSERT INTO recipe_items (recipe_id, product_id, quantity_needed, unit) VALUES (?, ?, ?, ?)',
          [recipeId, item.product_id, item.quantity_needed, item.unit]
        );
      }
    }

    res.status(201).json({ id: recipeId, message: 'Retsept muvaffaqiyatli yaratildi' });
  } catch (error) {
    if (error.message.includes('NOYOB cheklov bajarilmadi')) {
      return res.status(400).json({ error: 'Bu nomdagi retsept allaqachon mavjud' });
    }
    console.error('Retsept yaratishda xatolik yuz berdi:', error);
    res.status(500).json({ error: 'Retsept yaratilmadi' });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, meal_type, description } = req.body;

    const recipe = await getOne('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!recipe) return res.status(404).json({ error: 'Retsept topilmadi' });

    await runQuery(
      'UPDATE recipes SET name = ?, meal_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        name || recipe.name,
        meal_type || recipe.meal_type,
        description !== undefined ? description : recipe.description,
        id,
      ]
    );

    res.json({ message: 'Retsept muvaffaqiyatli yangilandi' });
  } catch (error) {
    console.error('Retseptni yangilashda xatolik yuz berdi:', error);
    res.status(500).json({ error: 'Retseptni yangilashda xatolik yuz berdi' });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await getOne('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!recipe) return res.status(404).json({ error: 'Retsept topilmadi' });

    await runQuery('DELETE FROM recipes WHERE id = ?', [id]);
    res.json({ message: "Retsept muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Retseptni o'chirishda xatolik yuz berdi:", error);
    res.status(500).json({ error: "Retseptni o'chirishda xatolik yuz berdi" });
  }
};

const addRecipeItem = async (req, res) => {
  try {
    const { recipe_id, product_id, quantity_needed, unit } = req.body;
    if (!recipe_id || !product_id || !quantity_needed || !unit) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }

    const recipe = await getOne('SELECT id FROM recipes WHERE id = ?', [recipe_id]);
    if (!recipe) return res.status(404).json({ error: 'Retsept topilmadi' });

    const product = await getOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

    const result = await runQuery(
      'INSERT INTO recipe_items (recipe_id, product_id, quantity_needed, unit) VALUES (?, ?, ?, ?)',
      [recipe_id, product_id, quantity_needed, unit]
    );

    res.status(201).json({ id: result.lastID, message: "Retsept elementi muvaffaqiyatli qo'shildi" });
  } catch (error) {
    console.error("Retsept elementini qo'shishda xatolik yuz berdi:", error);
    res.status(500).json({ error: "Retsept elementini qo'shishda xatolik yuz berdi" });
  }
};

const updateRecipeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity_needed, unit } = req.body;

    const item = await getOne('SELECT * FROM recipe_items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: "Retsept bo'yicha mahsulot topilmadi" });

    await runQuery(
      'UPDATE recipe_items SET product_id = ?, quantity_needed = ?, unit = ? WHERE id = ?',
      [
        product_id || item.product_id,
        quantity_needed !== undefined ? quantity_needed : item.quantity_needed,
        unit || item.unit,
        id
      ]
    );

    res.json({ message: 'Retsept elementi muvaffaqiyatli yangilandi' });
  } catch (error) {
    console.error('Retsept elementini yangilashda xatolik yuz berdi:', error);
    res.status(500).json({ error: 'Retsept elementini yangilashda xatolik yuz berdi' });
  }
};

const removeRecipeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getOne('SELECT * FROM recipe_items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: "Retsept bo'yicha mahsulot topilmadi" });

    await runQuery('DELETE FROM recipe_items WHERE id = ?', [id]);
    res.json({ message: 'Retsept elementi muvaffaqiyatli olib tashlandi' });
  } catch (error) {
    console.error('Retsept elementini olib tashlashda xatolik yuz berdi:', error);
    res.status(500).json({ error: 'Retsept elementini olib tashlashda xatolik yuz berdi' });
  }
};

module.exports = {
  getAllRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addRecipeItem,
  updateRecipeItem,
  removeRecipeItem,
};
