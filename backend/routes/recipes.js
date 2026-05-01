const express = require('express');
const {
  getAllRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addRecipeItem,
  updateRecipeItem,
  removeRecipeItem,
} = require('../controllers/recipeController');

const router = express.Router();

router.get('/', getAllRecipes);
router.get('/:id(\\d+)', getRecipe);
router.post('/', createRecipe);
router.put('/:id(\\d+)', updateRecipe);
router.delete('/:id(\\d+)', deleteRecipe);

router.post('/items', addRecipeItem);
router.put('/items/:id(\\d+)', updateRecipeItem);
router.delete('/items/:id(\\d+)', removeRecipeItem);

module.exports = router;
