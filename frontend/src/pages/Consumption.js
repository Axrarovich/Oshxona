import React, { useEffect, useState } from 'react';
import { consumptionAPI, recipeAPI, productAPI } from '../services/api';
import { getUnitLabel, toStandardUnit, formatQuantity } from '../utils/unitLabel';
import ConfirmModal from '../components/ConfirmModal';

const normalizeUnit = (unit) => {
  if (unit === 'liter') return 'litr';
  if (unit === 'g') return 'kg';
  return unit;
};

const getBaseUnit = (unit) => {
  const normalized = normalizeUnit(unit);
  if (normalized === 'kg') return 'kg';
  if (normalized === 'litr') return 'litr';
  if (normalized === 'paket') return 'paket';
  return 'dona';
};

export default function Consumption({ hideTitle = false }) {
  const [records, setRecords] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRecipeDetails, setSelectedRecipeDetails] = useState(null);
  const [formData, setFormData] = useState({
    recipe_id: '',
    meal_type: 'lunch',
    expected_people: '',
    notes: '',
  });

  // Confirm Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [consumptionToDelete, setConsumptionToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (formData.recipe_id) {
        try {
          const res = await recipeAPI.getOne(formData.recipe_id);
          setSelectedRecipeDetails(res.data);
        } catch (err) {
          console.error('Retsept tafsilotlarini olishda xatolik:', err);
        }
      } else {
        setSelectedRecipeDetails(null);
      }
    };
    fetchRecipeDetails();
  }, [formData.recipe_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, recipesRes, productsRes] = await Promise.all([
        consumptionAPI.getByDate(selectedDate),
        recipeAPI.getAll(),
        productAPI.getInventory(),
      ]);
      setRecords(recordsRes.data || []);
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
    setFormData({
      recipe_id: '',
      meal_type: 'lunch',
      expected_people: '',
      notes: '',
    });
    setSelectedRecipeDetails(null);
    setShowForm(false);
    setEditingId(null);
    setEditingRecord(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.recipe_id || !formData.expected_people) {
        setError('Majburiy maydonlarni to\'ldiring');
        return;
      }

      const data = {
        recipe_id: parseInt(formData.recipe_id),
        meal_type: formData.meal_type,
        date: selectedDate,
        expected_people: parseInt(formData.expected_people),
        notes: formData.notes || '',
      };

      if (editingId) {
        await consumptionAPI.update(editingId, data);
      } else {
        await consumptionAPI.create(data);
      }

      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Iste'mol ma'lumotini saqlashda xatolik yuz berdi");
    }
  };

  const handleEdit = async (record) => {
    setFormData({
      recipe_id: record.recipe_id,
      meal_type: record.meal_type,
      expected_people: record.expected_people,
      notes: record.notes || '',
    });
    setEditingId(record.id);
    setEditingRecord(record);
    setShowForm(true);
    setError(null);
  };

  const handleDeleteClick = (id) => {
    setConsumptionToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (consumptionToDelete) {
      try {
        await consumptionAPI.delete(consumptionToDelete);
        fetchData();
        setIsConfirmOpen(false);
        setConsumptionToDelete(null);
      } catch (err) {
        setError("Iste'mol ma'lumotini o'chirishda xatolik yuz berdi");
        setIsConfirmOpen(false);
      }
    }
  };

  if (loading && !showForm) return <div className="loading">Ma'lumotlar yuklanmoqda...</div>;

  const mealTypeLabel = {
    breakfast: '🌅 Nonushta',
    lunch: '🍽️ Tushlik',
    dinner: '🌙 Kechki taom',
  };

  // Mahsulot miqdorini topish uchun yordamchi funksiya
  const getInStock = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    // Qoldiq (kg/litrda)
    let remainingInStandard = (product.remaining !== undefined ? product.remaining : (product.quantity || 0)) * (product.piece_weight_kg || 1);

    // Agar tahrirlash rejimida bo'lsak, ushbu iste'mol uchun ishlatilgan miqdorni qaytaramiz (vizual)
    if (editingId && editingRecord && editingRecord.recipe_id === selectedRecipeDetails?.id) {
      const item = selectedRecipeDetails.items?.find(i => i.product_id === productId);
      if (item) {
        const alreadyUsed = toStandardUnit(parseFloat(item.quantity_needed) * parseInt(editingRecord.expected_people), item.unit);
        remainingInStandard += alreadyUsed;
      }
    }

    return remainingInStandard;
  };

  // Mahsulot yetishmovchiligi borligini tekshirish
  const hasShortage = selectedRecipeDetails?.items?.some(item => {
    const totalNeeded = (parseFloat(item.quantity_needed) * (parseInt(formData.expected_people) || 0));
    const totalNeededStandard = toStandardUnit(totalNeeded, item.unit);
    const inStock = getInStock(item.product_id);
    return totalNeededStandard > (inStock + 0.000001); // Kichik farqlarni hisobga olmaslik uchun
  });

  return (
    <div className={hideTitle ? "" : "container"}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {!hideTitle && <h2 className="section-title" style={{ margin: 0 }}>Ovqat iste'moli</h2>}
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          style={hideTitle ? { marginLeft: 'auto' } : {}}
        >
          ➕ Yangi iste'mol
        </button>
      </div>

      {error && !showForm && <div className="alert alert-error">{error}</div>}

      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Sanani tanlang</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ maxWidth: '200px' }}
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>{editingId ? "Iste'mol ma'lumotini tahrirlash" : "Yangi iste'mol ma'lumoti"}</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <form onSubmit={handleSubmit} id="consumption-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Taom retsepti *</label>
                    <select
                      name="recipe_id"
                      value={formData.recipe_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Tanlang...</option>
                      {recipes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Taom turi *</label>
                    <select
                      name="meal_type"
                      value={formData.meal_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="breakfast">Nonushta</option>
                      <option value="lunch">Tushlik</option>
                      <option value="dinner">Kechki taom</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mo'ljallangan kishi soni *</label>
                    <input
                      type="number"
                      name="expected_people"
                      value={formData.expected_people}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {selectedRecipeDetails && selectedRecipeDetails.items && (
                  <div className="recipe-items-preview" style={{ 
                    marginTop: '15px', 
                    marginBottom: '15px', 
                    padding: '15px', 
                    backgroundColor: 'var(--bg-surface-alt)', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)'
                  }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                      Taom uchun mahsulotlar:
                    </h4>
                    <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: 0 }}>
                      <table className="table table-sm" style={{ fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th>Mahsulot</th>
                            <th>1 kishi uchun</th>
                            <th>Jami ({formData.expected_people || 0} kishi)</th>
                            <th>Omborda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecipeDetails.items.map((item) => {
                            const totalNeeded = (parseFloat(item.quantity_needed) * (parseInt(formData.expected_people) || 0));
                            const totalNeededStandard = toStandardUnit(totalNeeded, item.unit);
                            const inStock = getInStock(item.product_id);
                            const product = products.find(p => p.id === item.product_id);
                            const isShortage = totalNeededStandard > (inStock + 0.000001);
                            
                            return (
                              <tr key={item.id}>
                                <td>{item.product_name}</td>
                                <td>{item.quantity_needed} {getUnitLabel(item.unit)}</td>
                                <td style={{ fontWeight: 'bold', color: isShortage ? 'var(--status-shortage)' : 'var(--status-ok)' }}>
                                  {formatQuantity(totalNeeded, item.unit)}
                                </td>
                                <td style={{ color: isShortage ? 'var(--status-shortage)' : 'inherit' }}>
                                  {Number(parseFloat(inStock).toFixed(3))} {product ? getBaseUnit(product.unit) : getUnitLabel(item.unit)}
                                  {isShortage && <span title="Yetarli emas" style={{ marginLeft: '5px' }}>⚠️</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Izoh</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Qo'shimcha ma'lumot..."
                    rows="2"
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Bekor qilish
              </button>
              <button 
                type="submit" 
                form="consumption-form" 
                className="btn btn-success"
                disabled={hasShortage || !formData.recipe_id || !formData.expected_people}
              >
                {hasShortage ? "⚠️ Yetarli emas" : "💾 Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Taom</th>
              <th>Turi</th>
              <th>Mo'ljallangan kishi soni</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map(record => (
                <tr key={record.id}>
                  <td><strong>{record.recipe_name}</strong></td>
                  <td>{mealTypeLabel[record.meal_type]}</td>
                  <td>{record.expected_people}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEdit(record)}
                    >
                      ✏️ Tahrirlash
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteClick(record.id)}
                    >
                      🗑️ O'chirish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-state">
                  Bu kun uchun iste'mol ma'lumotlari topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="O'chirishni tasdiqlang"
        message="Rostdan ham bu iste'mol ma'lumotini o'chirmoqchisiz?"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
