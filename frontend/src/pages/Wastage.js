import React, { useEffect, useState, useRef } from 'react';
import { wastageAPI, productAPI } from '../services/api';
import { getUnitLabel } from '../utils/unitLabel';
import ConfirmModal from '../components/ConfirmModal';

const normalizeUnit = (unit) => {
  if (unit === 'liter' || unit === 'l' || unit === 'litr') return 'litr';
  if (unit === 'g') return 'kg';
  if (unit === 'ml') return 'litr';
  return unit;
};

const getBaseUnit = (unit) => {
  const normalized = normalizeUnit(unit);
  if (normalized === 'kg') return 'kg';
  if (normalized === 'litr') return 'litr';
  if (normalized === 'paket') return 'paket';
  return 'dona';
};

export default function Wastage() {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity_wasted: '',
    reason: '',
    other_reason: '',
    unit: '',
  });

  // Confirm Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Searchable Dropdown state
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, productsRes] = await Promise.all([
        wastageAPI.getByDate(selectedDate),
        productAPI.getInventory(),
      ]);
      setRecords(recordsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("Ma'lumotlarni olishda xatolik:", err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product) => {
    let defaultUnit = product ? product.unit : '';
    
    if (defaultUnit === 'liter' || defaultUnit === 'l' || defaultUnit === 'litr') {
      defaultUnit = 'litr';
    } else if (defaultUnit === 'ml') {
      defaultUnit = 'ml';
    } else if (defaultUnit === 'g') {
      defaultUnit = 'g';
    }
    
    setFormData(prev => ({ 
      ...prev, 
      product_id: product.id,
      unit: defaultUnit
    }));
    setShowProductDropdown(false);
    setProductSearch('');
    setError(null);
  };

  const getSelectedProductName = () => {
    const product = products.find(p => p.id === parseInt(formData.product_id));
    return product ? product.name : 'Tanlang...';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setError(null);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ product_id: '', quantity_wasted: '', reason: '', other_reason: '', unit: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.product_id || !formData.quantity_wasted) {
        setError('Majburiy maydonlarni to\'ldiring');
        return;
      }

      if (formData.reason === 'Boshqa' && !formData.other_reason.trim()) {
        setError('Iltimos, isrof sababini kiriting');
        return;
      }

      const selectedProductForSubmit = products.find(p => p.id === parseInt(formData.product_id));
      let finalQuantity = parseFloat(formData.quantity_wasted);

      if (selectedProductForSubmit) {
        const pieceWeight = parseFloat(selectedProductForSubmit.piece_weight_kg) || 1;
        const formUnit = formData.unit;

        if (formUnit === 'g' || formUnit === 'ml') {
          finalQuantity = finalQuantity / 1000;
        } else if (formUnit === 'dona' || formUnit === 'paket') {
          finalQuantity = finalQuantity * pieceWeight;
        }

        let availableInStandard = parseFloat(selectedProductForSubmit.remaining) * pieceWeight;
        if (editingId) {
          const currentRecord = records.find(r => r.id === editingId);
          if (currentRecord) {
            availableInStandard += parseFloat(currentRecord.quantity_wasted);
          }
        }

        if (finalQuantity > availableInStandard + 0.000001) {
          const displayUnitLabel = getBaseUnit(selectedProductForSubmit.unit);
          setError(`Omborda yetarli mahsulot yo'q. Mavjud miqdor: ${parseFloat(availableInStandard.toFixed(3))} ${displayUnitLabel}`);
          return;
        }
      }

      const finalReason = formData.reason === 'Boshqa' ? formData.other_reason : formData.reason;

      const data = {
        product_id: parseInt(formData.product_id),
        quantity_wasted: finalQuantity,
        date: selectedDate,
        reason: finalReason || '',
      };

      if (editingId) {
        await wastageAPI.update(editingId, data);
      } else {
        await wastageAPI.create(data);
      }

      resetForm();
      setError(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Isrofni saqlashda xatolik yuz berdi');
    }
  };

  const handleEdit = (record) => {
    const product = products.find(p => p.id === record.product_id);
    const pieceWeight = product ? (parseFloat(product.piece_weight_kg) || 1) : 1;

    let displayUnit = record.product_unit;
    if (displayUnit === 'liter' || displayUnit === 'l' || displayUnit === 'litr') displayUnit = 'litr';

    let displayQuantity = parseFloat(record.quantity_wasted);
    
    if (displayUnit === 'dona' || displayUnit === 'paket') {
       displayQuantity = Number((displayQuantity / pieceWeight).toFixed(3));
    }

    const standardReasons = ['Yaroqsiz', 'Buzildi', 'Muddati o\'tdi'];
    const isOther = record.reason && !standardReasons.includes(record.reason) && record.reason !== '';

    setFormData({
      product_id: record.product_id,
      quantity_wasted: displayQuantity,
      reason: isOther ? 'Boshqa' : (record.reason || ''),
      other_reason: isOther ? record.reason : '',
      unit: displayUnit,
    });
    setEditingId(record.id);
    setShowForm(true);
    setError(null);
    setProductSearch('');
  };

  const handleDeleteClick = (id) => {
    setRecordToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        await wastageAPI.delete(recordToDelete);
        fetchData();
        setIsConfirmOpen(false);
        setRecordToDelete(null);
      } catch (err) {
        console.error("Isrofni o'chirishda xatolik:", err);
        setError(err.response?.data?.error || "Isrofni o'chirishda xatolik yuz berdi");
        setIsConfirmOpen(false);
      }
    }
  };

  if (loading && !showForm) return <div className="loading">Ma'lumotlar yuklanmoqda...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Isrof va yo'qotishlar</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ Yangi isrof
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
              <h3>{editingId ? 'Isrofni tahrirlash' : 'Yangi isrofni qayd etish'}</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
                
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Mahsulot *</label>
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
                                  className={`custom-select-option ${parseInt(formData.product_id) === p.id ? 'selected' : ''}`}
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
                    <label>Omborda mavjud</label>
                    <input
                      type="text"
                      value={selectedProduct ? 
                        `${Number((parseFloat(selectedProduct.remaining ?? 0) * (selectedProduct.piece_weight_kg ?? 1)).toFixed(3))} ${getBaseUnit(selectedProduct.unit)}` 
                        : '0'}
                      readOnly
                      className="readonly-field"
                      style={{ height: '41px' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Buzilgan miqdori *</label>
                    <input
                      type="number"
                      name="quantity_wasted"
                      value={formData.quantity_wasted}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.001"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Birligi</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      style={{ height: '41px' }}
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

                <div className="form-group">
                  <label>Sababi</label>
                  <select
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                  >
                    <option value="">Tanlang...</option>
                    <option value="Yaroqsiz">Yaroqsiz</option>
                    <option value="Buzildi">Buzildi</option>
                    <option value="Muddati o'tdi">Muddati o'tdi</option>
                    <option value="Boshqa">Boshqa</option>
                  </select>
                </div>

                {formData.reason === 'Boshqa' && (
                  <div className="form-group">
                    <label>Sababini kiriting *</label>
                    <input
                      type="text"
                      name="other_reason"
                      value={formData.other_reason}
                      onChange={handleInputChange}
                      placeholder="Isrof sababini yozing..."
                      required
                    />
                  </div>
                )}
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
              <th>Mahsulot</th>
              <th>Buzilgan miqdori</th>
              <th>Sababi</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td><strong>{record.product_name}</strong></td>
                  <td>
                    {`${Number(parseFloat(record.quantity_wasted).toFixed(3))} ${getBaseUnit(record.product_unit)}`}
                  </td>
                  <td>{record.reason || '-'}</td>
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
                <td colSpan="5" className="empty-state">
                  Bu kun uchun isrof ma'lumotlari topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="O'chirishni tasdiqlang"
        message="Rostdan ham ushbu isrof qaydini o'chirmoqchisiz?"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
