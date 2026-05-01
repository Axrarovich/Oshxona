import React, { useEffect, useState } from 'react';
import { productAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const isAutoOneUnit = (unit) => unit === 'dona' || unit === 'paket';

const normalizeUnit = (unit) => {
  if (unit === 'liter') return 'litr';
  if (unit === 'g') return 'kg'; // Grammlarni kg ga aylantiramiz
  return unit;
};

const getPieceWeightLabel = (unit) => {
  switch (normalizeUnit(unit)) {
    case 'kg':
      return '1 dona kg da';
    case 'litr':
      return '1 dona litr da';
    case 'dona':
    case 'paket':
      return '1 donaga';
    default:
      return '1 dona kg da';
  }
};

const getUnitDescription = (unit, weight) => {
  const normalized = normalizeUnit(unit);
  const w = weight || 0;
  switch (normalized) {
    case 'kg':
      return `1 dona ${w} kg`;
    case 'litr':
      return `1 dona ${w} litr`;
    case 'dona':
      return `1 dona ${w} dona`;
    case 'paket':
      return `1 dona ${w} paket`;
    default:
      return `1 dona ${w} ${unit}`;
  }
};

const getBaseUnit = (unit) => {
  const normalized = normalizeUnit(unit);
  if (normalized === 'kg') return 'kg';
  if (normalized === 'litr') return 'litr';
  if (normalized === 'paket') return 'paket';
  return 'dona';
};

const formatCurrency = (val) => {
  return Number(val).toLocaleString('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const formatDisplayDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    purchase_price: '',
    piece_weight_kg: '',
    quantity: '',
  });

  // Confirm Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productAPI.getInventory();
      setProducts(res.data || []);
    } catch (err) {
      console.error('Mahsulotlarni olishda xatolik:', err);
      setError("Mahsulotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'unit') {
      setFormData((prev) => {
        const nextUnit = value;
        const nextPieceWeight = isAutoOneUnit(nextUnit)
          ? '1'
          : isAutoOneUnit(prev.unit)
            ? ''
            : prev.piece_weight_kg;

        return { ...prev, unit: nextUnit, piece_weight_kg: nextPieceWeight };
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', unit: 'kg', purchase_price: '', piece_weight_kg: '', quantity: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.unit || !formData.purchase_price) {
        setError("Majburiy maydonlarni to'ldiring");
        return;
      }

      if (!formData.piece_weight_kg || Number(formData.piece_weight_kg) <= 0) {
        setError("Majburiy maydonlarni to'ldiring");
        return;
      }

      const normalizedPieceWeight = isAutoOneUnit(formData.unit) ? 1 : parseFloat(formData.piece_weight_kg);
      if (!Number.isFinite(normalizedPieceWeight) || normalizedPieceWeight <= 0) {
        setError("Majburiy maydonlarni to'ldiring");
        return;
      }

      const payload = {
        name: formData.name,
        unit: formData.unit,
        purchase_price: parseFloat(formData.purchase_price),
        piece_weight_kg: normalizedPieceWeight,
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
      };

      if (editingId) {
        await productAPI.update(editingId, payload);
      } else {
        await productAPI.create(payload);
      }

      setError(null);
      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Mahsulotni saqlashda xatolik yuz berdi");
    }
  };

  const handleEdit = (product) => {
    const normalizedUnit = normalizeUnit(product.unit || 'kg');
    setFormData({
      name: product.name || '',
      unit: normalizedUnit,
      purchase_price: product.purchase_price ?? '',
      piece_weight_kg: isAutoOneUnit(normalizedUnit) ? '1' : (product.piece_weight_kg ?? ''),
      quantity: product.quantity ?? '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDeleteClick = (id) => {
    setProductToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await productAPI.delete(productToDelete);
        fetchProducts();
        setIsConfirmOpen(false);
        setProductToDelete(null);
      } catch (err) {
        setError("Mahsulotni o'chirishda xatolik yuz berdi");
        setIsConfirmOpen(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading">Mahsulotlar yuklanmoqda...</div>;

  return (
    <div className="container">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Qolgan Mahsulotlar</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={handlePrint}
            type="button"
          >
            🖨️ Chop etish
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setError(null);
              setShowForm(true);
            }}
            type="button"
          >
            ➕ Yangi mahsulot
          </button>
        </div>
      </div>

      <div className="print-only">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Qolgan Mahsulotlar Ro'yxati</h2>
        <p style={{ textAlign: 'right', marginBottom: '10px' }}>Sana: {formatDisplayDate(new Date())}</p>
      </div>

      {error && !showForm && <div className="alert alert-error no-print">{error}</div>}

      {showForm && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Mahsulot nomi *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Masalan: Go'sht, Yog', Sabzi..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Birligi *</label>
                    <select name="unit" value={formData.unit} onChange={handleInputChange} required>
                      <option value="kg">Kg (kilogramm)</option>
                      <option value="litr">L (litr)</option>
                      <option value="dona">Dona</option>
                      <option value="paket">Paket</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{getPieceWeightLabel(formData.unit)} *</label>
                    <input
                      type="number"
                      name="piece_weight_kg"
                      value={formData.piece_weight_kg}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.001"
                      min={isAutoOneUnit(formData.unit) ? '1' : '0.001'}
                      required
                      readOnly={isAutoOneUnit(formData.unit)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sotib olingan narxi (so'm) *</label>
                    <input
                      type="number"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Dona</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="form-group" />
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
              <th style={{ width: '50px' }}>№</th>
              <th>Nomi</th>
              <th>Tan narxi (so'm)</th>
              <th>Birlik og‘irligi</th>
              <th>Umumiy miqdor</th>
              <th className="no-print">Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((p, index) => (
                <tr key={p.id}>
                  <td>{index + 1}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{formatCurrency(p.purchase_price || 0)}</td>
                  <td>{getUnitDescription(p.unit, p.piece_weight_kg)}</td>
                  <td>
                    {Number(((p.remaining ?? p.quantity ?? 0) * (p.piece_weight_kg ?? 1)).toFixed(3))} {getBaseUnit(p.unit)}
                  </td>
                  <td className="action-buttons no-print">
                    <button className="btn btn-secondary btn-small" onClick={() => handleEdit(p)} type="button">
                      ✏️ Tahrirlash
                    </button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDeleteClick(p.id)} type="button">
                      🗑️ O'chirish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  Mahsulotlar topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="O'chirishni tasdiqlang"
        message="Rostdan ham bu mahsulotni o'chirmoqchisiz?"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
