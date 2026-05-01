import React, { useEffect, useState } from 'react';
import { logAPI, productAPI, recipeAPI } from '../services/api';
import { getUnitLabel, formatQuantity } from '../utils/unitLabel';
import ConfirmModal from '../components/ConfirmModal';

export default function DailyLogs({ hideTitle = false }) {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity_used: '',
    recipe_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Confirm Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, productsRes, recipesRes] = await Promise.all([
        logAPI.getByDate(selectedDate),
        productAPI.getAll(),
        recipeAPI.getAll(),
      ]);
      setLogs(logsRes.data || []);
      setProducts(productsRes.data || []);
      setRecipes(recipesRes.data || []);
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
      product_id: '',
      quantity_used: '',
      recipe_id: '',
      date: selectedDate,
      notes: '',
    });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.product_id || !formData.quantity_used) {
        setError('Majburiy maydonlarni to\'ldiring');
        return;
      }

      await logAPI.create({
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity_used: parseFloat(formData.quantity_used),
        recipe_id: formData.recipe_id || null,
        date: selectedDate
      });

      resetForm();
      setError(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Logni saqlashda xatolik yuz berdi');
    }
  };

  const handleDeleteClick = (id) => {
    setLogToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (logToDelete) {
      try {
        await logAPI.delete(logToDelete);
        fetchData();
        setIsConfirmOpen(false);
        setLogToDelete(null);
      } catch (err) {
        setError('Logni o\'chirishda xatolik yuz berdi');
        setIsConfirmOpen(false);
      }
    }
  };

  if (loading) return <div className="loading">Loglar yuklanmoqda...</div>;

  return (
    <div className={hideTitle ? "" : "container"}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {!hideTitle && <h2 className="section-title" style={{ margin: 0 }}>Kunlik mahsulot iste'moli</h2>}
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setError(null);
            setShowForm(true);
          }}
          style={hideTitle ? { marginLeft: 'auto' } : {}}
        >
          ➕ Yangi log
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
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yangi log qo'shish</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Mahsulot *</label>
                    <select
                      name="product_id"
                      value={formData.product_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Tanlang...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ishlatilgan miqdori *</label>
                    <input
                      type="number"
                      name="quantity_used"
                      value={formData.quantity_used}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Retsept (ixtiyoriy)</label>
                    <select
                      name="recipe_id"
                      value={formData.recipe_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Tanlang...</option>
                      {recipes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Izohlar</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Qo'shimcha ma'lumot..."
                    rows="2"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Bekor qilish</button>
                <button type="submit" className="btn btn-success">💾 Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Mahsulot</th>
              <th>Ishlatilgan miqdori</th>
              <th>Retsept</th>
              <th>Izohlar</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map(log => (
                <tr key={log.id}>
                  <td><strong>{log.product_name}</strong></td>
                  <td>{formatQuantity(log.quantity_used, log.unit)}</td>
                  <td>{log.recipe_name || '-'}</td>
                  <td>{log.notes || '-'}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteClick(log.id)}
                    >
                      🗑️ O'chirish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  Bu kun uchun loglar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="O'chirishni tasdiqlang"
        message="Rostdan ham bu logni o'chirmoqchisiz?"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
