import React, { useEffect, useState, useRef } from 'react';
import { recipeAPI, productAPI } from '../services/api';
import { getUnitLabel } from '../utils/unitLabel';
import ConfirmModal from '../components/ConfirmModal';

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [editingRecipeItemId, setEditingRecipeItemId] = useState(null);
  
  // Local items for new recipe
  const [tempItems, setTempItems] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    meal_type: 'lunch',
    description: '',
  });
  const [recipeItemForm, setRecipeItemForm] = useState({
    product_id: '',
    quantity_needed: '',
    unit: 'kg',
  });
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Searchable Dropdown state
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchRecipesAndProducts();
    
    // Click outside to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecipesAndProducts = async () => {
    try {
      setLoading(true);
      const [recipesRes, productsRes] = await Promise.all([
        recipeAPI.getAll(),
        productAPI.getAll(),
      ]);
      setRecipes(recipesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("Ma'lumotlarni olishda xatolik:", err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', meal_type: 'lunch', description: '' });
    setEditingId(null);
    setSelectedRecipe(null);
    setTempItems([]);
    setShowForm(false);
    setShowAddItemForm(false);
    setEditingRecipeItemId(null);
    setError(null);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const currentItems = editingId ? (selectedRecipe?.items || []) : tempItems;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!formData.name) {
        setError('Retsept nomini kiriting');
        return;
      }

      if (currentItems.length === 0) {
        setError('Kamida bitta mahsulot qo\'shishingiz shart');
        return;
      }

      if (editingId) {
        await recipeAPI.update(editingId, formData);
      } else {
        await recipeAPI.create({
          ...formData,
          items: tempItems
        });
      }

      resetForm();
      setError(null);
      fetchRecipesAndProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Retseptni saqlashda xatolik yuz berdi');
    }
  };

  const handleEdit = async (recipe) => {
    try {
      setLoading(true);
      const res = await recipeAPI.getOne(recipe.id);
      const fullRecipe = res.data;
      setFormData({
        name: fullRecipe.name,
        meal_type: fullRecipe.meal_type,
        description: fullRecipe.description || '',
      });
      setEditingId(fullRecipe.id);
      setSelectedRecipe(fullRecipe);
      setShowForm(true);
      setError(null);
    } catch (err) {
      setError('Retsept ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Retseptni o\'chirish',
      message: 'Rostdan ham bu retseptni o\'chirmoqchisiz?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await recipeAPI.delete(id);
          fetchRecipesAndProducts();
          closeConfirmModal();
        } catch (err) {
          setError('Retseptni o\'chirishda xatolik yuz berdi');
          closeConfirmModal();
        }
      }
    });
  };

  const handleRecipeItemSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      if (!recipeItemForm.product_id || !recipeItemForm.quantity_needed) {
        setError('Barcha maydonlarni to\'ldiring');
        return;
      }

      const productId = parseInt(recipeItemForm.product_id);
      
      const isDuplicate = currentItems.some((item, index) => {
        if (editingId) {
          return item.product_id === productId && item.id !== editingRecipeItemId;
        } else {
          return item.product_id === productId && index !== editingRecipeItemId;
        }
      });

      if (isDuplicate) {
        setError('Ushbu mahsulot allaqachon qo\'shilgan');
        return;
      }

      const product = products.find(p => p.id === productId);
      const itemData = {
        product_id: productId,
        product_name: product ? product.name : '',
        quantity_needed: parseFloat(recipeItemForm.quantity_needed),
        unit: recipeItemForm.unit,
      };

      if (editingId) {
        const apiData = { ...itemData, recipe_id: editingId };
        if (editingRecipeItemId) {
          await recipeAPI.updateItem(editingRecipeItemId, apiData);
        } else {
          await recipeAPI.addItem(apiData);
        }
        const res = await recipeAPI.getOne(editingId);
        setSelectedRecipe(res.data);
      } else {
        if (editingRecipeItemId !== null) {
          const newItems = [...tempItems];
          newItems[editingRecipeItemId] = itemData;
          setTempItems(newItems);
        } else {
          setTempItems([...tempItems, itemData]);
        }
      }

      setRecipeItemForm({ product_id: '', quantity_needed: '', unit: 'kg' });
      setEditingRecipeItemId(null);
      setError(null);
      setProductSearch('');
      setShowProductDropdown(false);
    } catch (err) {
      setError('Retsept mahsulotini saqlashda xatolik yuz berdi');
    }
  };

  const handleEditRecipeItem = (item, index) => {
    setRecipeItemForm({
      product_id: item.product_id,
      quantity_needed: item.quantity_needed,
      unit: item.unit,
    });
    setEditingRecipeItemId(editingId ? item.id : index);
    setShowAddItemForm(true);
    setError(null);
    setProductSearch('');
  };

  const handleRemoveItemClick = (item, index) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mahsulotni o\'chirish',
      message: 'Rostdan ham bu mahsulotni retseptdan o\'chirmoqchisiz?',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (editingId) {
            await recipeAPI.removeItem(item.id);
            const res = await recipeAPI.getOne(editingId);
            setSelectedRecipe(res.data);
          } else {
            const newItems = tempItems.filter((_, i) => i !== index);
            setTempItems(newItems);
          }
          closeConfirmModal();
        } catch (err) {
          setError('Mahsulotni o\'chirishda xatolik yuz berdi');
          closeConfirmModal();
        }
      }
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const selectProduct = (product) => {
    let unit = product.unit || 'kg';
    if (unit === 'l' || unit === 'liter' || unit === 'litr') unit = 'litr';
    else if (unit === 'gramm' || unit === 'g') unit = 'g';
    else if (unit === 'ml') unit = 'ml';

    setRecipeItemForm(prev => ({
      ...prev,
      product_id: product.id,
      unit: unit
    }));
    setShowProductDropdown(false);
    setProductSearch('');
  };

  const getSelectedProductName = () => {
    const product = products.find(p => p.id === parseInt(recipeItemForm.product_id));
    return product ? product.name : 'Tanlang...';
  };

  if (loading && !showForm) return <div className="loading">Retseptlar yuklanmoqda...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Retseptlar</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ Yangi taom
        </button>
      </div>

      {error && !showForm && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Retseptni tahrirlash' : 'Yangi retsept qo\'shish'}</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
              
              <form onSubmit={handleSubmit} id="recipe-form">
                <div className="form-group">
                  <label>Retsept nomi *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Masalan: Osh, Manti, Sho'rva..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Taom turi *</label>
                  <select name="meal_type" value={formData.meal_type} onChange={handleInputChange} required>
                    <option value="breakfast">Nonushta</option>
                    <option value="lunch">Tushlik</option>
                    <option value="dinner">Kechki taom</option>
                  </select>
                </div>
              </form>

              <div className="recipe-items-section" style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <h4 style={{ marginBottom: '15px' }}>Taom uchun mahsulotlar (Bir kishi uchun)</h4>
                
                <div className="table-container" style={{ marginBottom: '15px', maxHeight: '250px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>№</th>
                        <th>MAHSULOT</th>
                        <th>MIQDORI</th>
                        <th>HARAKATLAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
                        currentItems.map((item, index) => (
                          <tr key={editingId ? item.id : index}>
                            <td>{index + 1}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity_needed} {item.unit === 'ml' ? 'ml' : getUnitLabel(item.unit)}</td>
                            <td className="action-buttons">
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => handleEditRecipeItem(item, index)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-small"
                                onClick={() => handleRemoveItemClick(item, index)}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="empty-state">Mahsulotlar qo'shilmagan</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!showAddItemForm ? (
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => {
                      setEditingRecipeItemId(null);
                      setRecipeItemForm({ product_id: '', quantity_needed: '', unit: 'kg' });
                      setShowAddItemForm(true);
                      setError(null);
                      setProductSearch('');
                    }}
                  >
                    <span style={{ fontSize: '1.2em' }}>+</span> Mahsulot qo'shish
                  </button>
                ) : (
                  <div style={{ padding: '15px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: '4px' }}>
                    <h5 style={{ marginBottom: '10px' }}>{editingRecipeItemId !== null ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}</h5>
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <label>Mahsulot</label>
                        <div className="custom-select-container" ref={dropdownRef}>
                          <div 
                            className="custom-select-display"
                            onClick={() => setShowProductDropdown(!showProductDropdown)}
                          >
                            {getSelectedProductName()}
                            <span>{showProductDropdown ? '▲' : '▼'}</span>
                          </div>
                          
                          {showProductDropdown && (
                            <div className="custom-select-dropdown">
                              <div className="custom-select-search">
                                <input
                                  type="text"
                                  placeholder="🔎 Mahsulotni qidirish..."
                                  value={productSearch}
                                  onChange={(e) => setProductSearch(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="custom-select-options">
                                {products
                                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                  .map(p => (
                                    <div 
                                      key={p.id} 
                                      className={`custom-select-option ${parseInt(recipeItemForm.product_id) === p.id ? 'selected' : ''}`}
                                      onClick={() => selectProduct(p)}
                                    >
                                      {p.name}
                                    </div>
                                  ))}
                                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                  <div className="custom-select-option dropdown-empty-state">
                                    Mahsulot topilmadi
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Miqdori</label>
                        <input
                          type="number"
                          value={recipeItemForm.quantity_needed}
                          onChange={(e) => setRecipeItemForm(prev => ({ ...prev, quantity_needed: e.target.value }))}
                          step="0.001"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Birligi</label>
                        <select
                          value={recipeItemForm.unit}
                          onChange={(e) => setRecipeItemForm(prev => ({ ...prev, unit: e.target.value }))}
                        >
                          <option value="kg">Kg</option>
                          <option value="g">G</option>
                          <option value="litr">Litr</option>
                          <option value="ml">mL</option>
                          <option value="dona">Dona</option>
                          <option value="paket">Paket</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        type="button" 
                        className="btn btn-success btn-small" 
                        style={{ flex: 1 }}
                        onClick={handleRecipeItemSubmit}
                      >
                        {editingRecipeItemId !== null ? '💾 Saqlash' : '➕ Qo\'shish'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                          setShowAddItemForm(false);
                          setEditingRecipeItemId(null);
                          setError(null);
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }}
                      >
                        Bekor qilish
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Izoh</label>
                <textarea
                  name="description"
                  form="recipe-form"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Retsept haqida qo'shimcha ma'lumot..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
              <button 
                type="submit" 
                form="recipe-form" 
                className="btn btn-success"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                💾 Retseptni saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>№</th>
              <th>Nomi</th>
              <th>Turi</th>
              <th>Izoh</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {recipes.length > 0 ? (
              recipes.map((recipe, index) => (
                <tr key={recipe.id}>
                  <td>{index + 1}</td>
                  <td><strong>{recipe.name}</strong></td>
                  <td>{recipe.meal_type === 'breakfast' ? 'Nonushta' : recipe.meal_type === 'lunch' ? 'Tushlik' : 'Kechki taom'}</td>
                  <td>{recipe.description || '-'}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEdit(recipe)}
                    >
                      ✏️ Tahrirlash
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteClick(recipe.id)}
                    >
                      🗑️ O'chirish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  Retseptlar topilmadi. Birinchi retseptni qo'shing!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        type={confirmModal.type}
      />
    </div>
  );
}
