import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI, consumptionAPI, wastageAPI } from '../services/api';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    todayExpectedPeople: 0,
    totalWastage: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const [productsRes, consumptionRes, wastageRes] = await Promise.all([
        productAPI.getInventory(),
        consumptionAPI.getByDate(today),
        wastageAPI.getByDate(today),
      ]);

      const products = productsRes.data || [];
      const productsMap = products.reduce((map, p) => {
        map[p.id] = p;
        return map;
      }, {});

      // Hisobotlar bo'limidagi kabi mantiq: (qolgan dona * vazni) * narxi
      const totalValue = products.reduce((sum, p) => {
        const remainingKg = (p.remaining || 0) * (p.piece_weight_kg || 1);
        const itemValue = remainingKg * (p.purchase_price || 0);
        return sum + itemValue;
      }, 0);

      const todayExpectedPeople = (consumptionRes.data || []).reduce((sum, c) => sum + (c.expected_people || 0), 0);
      
      const wastageGrouped = (wastageRes.data || []).reduce((acc, w) => {
        const product = productsMap[w.product_id];
        const unit = getBaseUnit(w.product_unit);
        let amount = parseFloat(w.quantity_wasted);

        // Agar dona yoki paket bo'lsa, kg dan donaga o'tkazamiz
        if ((unit === 'dona' || unit === 'paket') && product) {
          const pieceWeight = parseFloat(product.piece_weight_kg) || 1;
          amount = amount / pieceWeight;
        }

        acc[unit] = (acc[unit] || 0) + amount;
        return acc;
      }, {});

      setStats({
        totalProducts: products.length,
        totalValue: totalValue,
        todayExpectedPeople: todayExpectedPeople,
        totalWastage: wastageGrouped,
      });
    } catch (err) {
      console.error("Bosh sahifa ma'lumotlarini olishda xatolik yuz berdi:", err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const renderWastageValue = () => {
    const entries = Object.entries(stats.totalWastage);
    if (entries.length === 0) return '0 kg';
    
    return entries
      .map(([unit, qty]) => `${Number(qty.toFixed(2))} ${unit}`)
      .join(', ');
  };

  if (loading) return <div className="loading">Ma'lumotlar yuklanmoqda...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="container">
      <h2 className="section-title">Bosh sahifa</h2>
      
      <div className="grid">
        <div className="card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="card-title">Mahsulotlar turi</div>
          <div className="card-value">{stats.totalProducts}</div>
          <div className="card-subtitle">Jami mahsulot turlari</div>
        </div>

        <div className="card" onClick={() => navigate('/reports', { state: { activeTab: 'inventory' } })} style={{ cursor: 'pointer' }}>
          <div className="card-title">Jami qiymat</div>
          <div className="card-value">{stats.totalValue.toLocaleString()} so'm</div>
          <div className="card-subtitle">Mavjud mahsulotlarning qiymati</div>
        </div>

        <div className="card" onClick={() => navigate('/consumptions')} style={{ cursor: 'pointer' }}>
          <div className="card-title">Bugungi kishi</div>
          <div className="card-value">{stats.todayExpectedPeople}</div>
          <div className="card-subtitle">Mo'ljallangan kishi soni</div>
        </div>

        <div className="card" onClick={() => navigate('/wastage')} style={{ cursor: 'pointer' }}>
          <div className="card-title">Bugungi isrof</div>
          <div className="card-value" style={{ fontSize: Object.keys(stats.totalWastage).length > 2 ? '1.4rem' : 'inherit' }}>
            {renderWastageValue()}
          </div>
          <div className="card-subtitle">Isrof mahsulotlar miqdori</div>
        </div>
      </div>
    </div>
  );
}
