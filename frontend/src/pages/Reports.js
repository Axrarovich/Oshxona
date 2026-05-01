import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { reportAPI, logAPI } from '../services/api';

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

const translateMealType = (type) => {
  switch (type) {
    case 'breakfast': return 'Nonushta';
    case 'lunch': return 'Tushlik';
    case 'dinner': return 'Kechki taom';
    default: return type;
  }
};

const formatValue = (val) => {
  if (val === null || val === undefined) return '0';
  return Number(Number(val).toFixed(3));
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDisplayDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function Reports() {
  const location = useLocation();
  // State dan kelgan tabni boshlang'ich qiymat sifatida olamiz
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [mealDetails, setMealDetails] = useState([]);

  const fetchDailyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportAPI.getDailyReport(selectedDate);
      setData(response.data);
    } catch (err) {
      setError('Hisobotni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchMonthlyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportAPI.getMonthly(selectedYear, selectedMonth);
      setData(response.data);
    } catch (err) {
      setError('Oylik hisobotni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchInventoryReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportAPI.getInventory();
      setData(response.data);
    } catch (err) {
      setError('Hisob-kitoblarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Tab o'zgarganda ma'lumotlarni tozalash va qayta yuklash
  useEffect(() => {
    setData(null); // Oldingi tab ma'lumotlarini tozalash
    if (activeTab === 'daily') {
      fetchDailyReport();
    } else if (activeTab === 'monthly') {
      fetchMonthlyReport();
    } else if (activeTab === 'inventory') {
      fetchInventoryReport();
    }
  }, [activeTab, fetchDailyReport, fetchMonthlyReport, fetchInventoryReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleRecipeClick = async (meal) => {
    if (!meal.consumption_id) return;
    
    setSelectedMeal(meal);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const response = await logAPI.getByConsumption(meal.consumption_id);
      setMealDetails(response.data);
    } catch (err) {
      console.error('Xarajatlarni yuklashda xatolik:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Inventar uchun jami qiymatni hisoblash
  const calculateInventoryTotal = () => {
    if (!data || !data.inventory) return 0;
    return data.inventory.reduce((sum, item) => {
      return sum + (Number(item.remaining_value) || 0);
    }, 0);
  };

  const inventoryTotal = activeTab === 'inventory' ? calculateInventoryTotal() : 0;

  return (
    <div className="container">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Hisobotlar va tahlillar</h2>
        {activeTab !== 'monthly' && (activeTab !== 'inventory' || (data && data.inventory && data.inventory.length > 0)) && (
          <button className="btn btn-secondary" onClick={handlePrint} type="button">
            🖨️ Chop etish
          </button>
        )}
      </div>

      <div className="print-only">
        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 'bold', fontSize: '24px' }}>
          {activeTab === 'daily' && "Kunlik Hisobot"}
          {activeTab === 'monthly' && "Oylik Hisobot"}
          {activeTab === 'inventory' && "Qolgan Mahsulotlar Ro'yxati"}
        </h2>
        <p style={{ textAlign: 'right', marginBottom: '20px', fontSize: '14px' }}>Sana: {formatDisplayDate(new Date())}</p>
      </div>

      <div className="form-card no-print" style={{ marginBottom: '20px', padding: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('daily')}
          >
            📅 Kunlik chiqim
          </button>
          <button
            className={`btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('monthly')}
          >
            📊 Oylik hisobot
          </button>
          <button
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('inventory')}
          >
            📈 Hisob-kitob
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error no-print">{error}</div>}

      {/* Daily Report */}
      {activeTab === 'daily' && (
        <div>
          <div className="form-card no-print" style={{ marginBottom: '20px' }}>
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

          {loading ? (
            <div className="loading">Hisobot tayyorlanmoqda...</div>
          ) : data && data.products ? (
            <div className="form-card">
              <h3 className="no-print">📅 Kunlik chiqim: {formatDisplayDate(data.date)}</h3>

              {data.products && data.products.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 className="no-print" style={{ marginBottom: '10px' }}>Umumiy mahsulotlar iste'moli</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>№</th>
                          <th>MAHSULOT</th>
                          <th>JORIY MAHSULOT</th>
                          <th>ISHLATILGAN</th>
                          <th>BUZILGAN</th>
                          <th>QOLDIQ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.map((p, index) => {
                          const startQty = p.quantity;
                          const usedQty = p.used_today || 0;
                          const wastedQty = p.wasted_today || 0;
                          const remainingQty = startQty - usedQty - wastedQty;
                          const baseUnit = getBaseUnit(p.unit);

                          return (
                            <tr key={p.id}>
                              <td>{index + 1}</td>
                              <td><strong>{p.name}</strong></td>
                              <td>{formatValue(startQty)} {baseUnit}</td>
                              <td>{usedQty > 0 ? `${formatValue(usedQty)} ${baseUnit}` : '0'}</td>
                              <td>{wastedQty > 0 ? `${formatValue(wastedQty)} ${baseUnit}` : '0'}</td>
                              <td><strong>{formatValue(remainingQty)} {baseUnit}</strong></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : !loading && activeTab === 'daily' && <div>Ma'lumot topilmadi</div>}
        </div>
      )}

      {/* Monthly Report */}
      {activeTab === 'monthly' && (
        <div>
          <div className="form-card no-print" style={{ marginBottom: '20px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Oy</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                  <option value="1">Yanvar</option>
                  <option value="2">Fevral</option>
                  <option value="3">Mart</option>
                  <option value="4">Aprel</option>
                  <option value="5">May</option>
                  <option value="6">Iyun</option>
                  <option value="7">Iyul</option>
                  <option value="8">Avgust</option>
                  <option value="9">Sentabr</option>
                  <option value="10">Oktabr</option>
                  <option value="11">Noyabr</option>
                  <option value="12">Dekabr</option>
                </select>
              </div>
              <div className="form-group">
                <label>Yil</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">Oylik hisobot tayyorlanmoqda...</div>
          ) : data && (data.daily_summary || data.expenses) ? (
            <div className="form-card">
              <h3 className="no-print">📊 Oylik hisobot: {data.period}</h3>

              {data.daily_summary && (
                <div style={{ marginTop: '20px' }}>
                  <h4 className="no-print" style={{ marginBottom: '10px' }}>Kunlik umumlashtirish</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>№</th>
                          <th>KUN</th>
                          <th>TAOM Turi</th>
                          <th>TAOM Vaqti</th>
                          <th>MO'LJALLANGAN KISHI SONI</th>
                          <th>IZOH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily_summary.map((d, i) => (
                          <tr 
                            key={i} 
                            onClick={() => handleRecipeClick({ ...d, date: d.day })}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{i + 1}</td>
                            <td>{formatDisplayDate(d.day)}</td>
                            <td><strong style={{ color: 'var(--accent-hover)' }}>{d.recipe_name}</strong></td>
                            <td>{translateMealType(d.meal_type)}</td>
                            <td>{d.expected_people || 0}</td>
                            <td>{d.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.expenses && data.expenses.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h4 className="no-print" style={{ marginBottom: '10px' }}>Xarajatlar</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>№</th>
                          <th>TURI</th>
                          <th>UMUMIY SUMMA</th>
                          <th>SONI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expenses.map((e, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{e.type}</td>
                            <td><strong>{e.total_amount.toLocaleString()} so'm</strong></td>
                            <td>{e.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : !loading && activeTab === 'monthly' && <div>Ma'lumot topilmadi</div>}
        </div>
      )}

      {/* Inventory Report */}
      {activeTab === 'inventory' && (
        <div>
          {loading ? (
            <div className="loading">Inventar hisoboti tayyorlanmoqda...</div>
          ) : data && data.inventory ? (
            <div className="form-card">
              <div className="no-print inventory-summary-banner">
                <h3>Mavjud mahsulotlarning qiymati: {formatCurrency(inventoryTotal)} so'm</h3>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>№</th>
                      <th>MAHSULOT</th>
                      <th>NARXI (SO'M)</th>
                      <th>QOLDIQ MIQDORI</th>
                      <th>JAMI QIYMAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory && data.inventory.map((item, index) => {
                      return (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.purchase_price?.toLocaleString()}</td>
                          <td>{formatValue(item.remaining)} {getBaseUnit(item.unit)}</td>
                          <td><strong>{formatCurrency(item.remaining_value)} so'm</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="print-only" style={{ marginTop: '20px', textAlign: 'right' }}>
                <h3 style={{ fontSize: '14pt', fontWeight: 'bold' }}>Jami mahsulotlar narxi: {formatCurrency(inventoryTotal)} so'm</h3>
              </div>
            </div>
          ) : !loading && activeTab === 'inventory' && <div>Ma'lumot topilmadi</div>}
        </div>
      )}

      {/* Recipe Consumption Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{selectedMeal?.recipe_name} ({selectedMeal?.expected_people} kishi uchun xarajatlar)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {selectedMeal?.date && (
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    {formatDisplayDate(selectedMeal.date)}
                  </span>
                )}
                <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{ margin: 0 }}>&times;</button>
              </div>
            </div>
            <div className="modal-body">
              {modalLoading ? (
                <div className="loading">Yuklanmoqda...</div>
              ) : mealDetails.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>№</th>
                        <th>Mahsulot</th>
                        <th>Miqdor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealDetails.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{item.product_name}</strong></td>
                          <td>{formatValue(item.quantity_used)} {getBaseUnit(item.unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Ushbu taom uchun chiqim ma'lumotlari topilmadi.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
