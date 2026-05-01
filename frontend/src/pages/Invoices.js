import React, { useState, useEffect, useRef } from 'react';
import './Invoices.css';
import ConfirmModal from '../components/ConfirmModal';
import { productAPI } from '../services/api';

const UNITS = ['Kg', 'G', 'Litr', 'mL', 'Dona', 'Paket'];

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentRow, setCurrentRow] = useState([{ id: Date.now(), name: '', unit: 'Kg', quantity: '', extra1: '', extra2: '' }]);
  const [originalItems, setOriginalItems] = useState([]); // Tahrirlashdan oldingi holat
  const [receiver, setReceiver] = useState('Mirzokir');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(''); // Xatolik state'i
  const dateInputRef = useRef(null);

  // Inventar mahsulotlari va dropdown state'lari
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const dropdownContainerRef = useRef(null);

  // Confirm Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('oshxona_invoices');
    if (saved) {
      setInvoices(JSON.parse(saved));
    }
    fetchInventory();

    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        setActiveDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await productAPI.getInventory();
      setInventoryProducts(res.data || []);
    } catch (err) {
      console.error("Inventarni yuklashda xatolik:", err);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null || num === '') return '';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleInputChange = (index, field, value) => {
    const newRows = [...currentRow];
    
    // Miqdori, Narxi va Jami uchun vergullarni olib tashlaymiz (hisoblash va saqlash uchun)
    let cleanValue = value;
    if (field === 'quantity' || field === 'extra1' || field === 'extra2') {
      cleanValue = value.replace(/,/g, '');
    }
    
    newRows[index][field] = cleanValue;

    if (field === 'name') {
      setActiveDropdownIndex(index);
    }

    // Avtomatik hisoblash: Miqdori * Narxi = Jami
    if (field === 'quantity' || field === 'extra1' || field === 'unit') {
      const q = String(newRows[index].quantity).replace(/,/g, '');
      const p = String(newRows[index].extra1).replace(/,/g, '');
      const unit = newRows[index].unit;
      const qty = parseFloat(q);
      const price = parseFloat(p);
      
      if (!isNaN(qty) && !isNaN(price)) {
        let total = qty * price;
        // Agar gramm yoki ml bo'lsa, narx kg/litr uchun deb hisoblab 1000 ga bo'lamiz
        if (unit === 'G' || unit === 'mL') {
          total = total / 1000;
        }
        // Agar butun son bo'lsa butun, aks holda 2 ta kasr qismi bilan (keraksiz nollarsiz)
        newRows[index].extra2 = Number.isInteger(total) ? total.toString() : total.toFixed(2).replace(/\.?0+$/, '');
      }
    }

    setCurrentRow(newRows);
    if (error) setError(''); // Foydalanuvchi yozishni boshlasa xatoni o'chirish
  };

  const addRow = () => {
    setCurrentRow([...currentRow, { id: Date.now(), name: '', unit: 'Kg', quantity: '', extra1: '', extra2: '' }]);
  };

  const removeRow = (index) => {
    const newRows = currentRow.filter((_, i) => i !== index);
    if (newRows.length === 0) {
      setCurrentRow([{ id: Date.now(), name: '', unit: 'Kg', quantity: '', extra1: '', extra2: '' }]);
    } else {
      setCurrentRow(newRows);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Mahsulot birligi va miqdorini normallashtirish (G -> Kg, mL -> Litr)
  const getNormalizedData = (item) => {
    let qty = parseFloat(String(item.quantity).replace(/,/g, '')) || 0;
    let price = parseFloat(String(item.extra1).replace(/,/g, '')) || 0;
    let unit = (item.unit || 'Kg').toLowerCase();
    let targetUnit = unit;

    if (unit === 'g') {
      qty = qty / 1000;
      // Narx o'zgarmaydi, chunki u kg uchun kiritilgan deb hisoblanadi
      targetUnit = 'kg';
    } else if (unit === 'ml') {
      qty = qty / 1000;
      // Narx o'zgarmaydi, chunki u litr uchun kiritilgan deb hisoblanadi
      targetUnit = 'litr';
    } else if (unit === 'kg') {
      targetUnit = 'kg';
    } else if (unit === 'litr') {
      targetUnit = 'litr';
    } else if (unit === 'dona') {
      targetUnit = 'dona';
    } else if (unit === 'paket') {
      targetUnit = 'paket';
    }

    return { qty, price, unit: targetUnit };
  };

  // Ma'lumotlarni tekshirish funksiyasi
  const validateData = () => {
    const itemsToSave = currentRow.filter(item => 
      item.name.trim() !== '' || 
      String(item.quantity).trim() !== '' || 
      String(item.extra1).trim() !== '' || 
      String(item.extra2).trim() !== ''
    );

    if (itemsToSave.length === 0) {
      setError("Kamida bitta mahsulot kiriting!");
      return null;
    }

    const hasEmptyFields = itemsToSave.some(item => 
      item.name.trim() === '' || 
      !item.unit || 
      String(item.quantity).trim() === '' || 
      String(item.extra1).trim() === '' || 
      String(item.extra2).trim() === ''
    );

    if (hasEmptyFields) {
      setError("Iltimos, barcha qatorlarni to'liq to'ldiring (Nomi, Birligi, Miqdori, Narxi, Umumiy)!");
      return null;
    }

    // Mahsulot omborda borligini tekshirish
    for (const item of itemsToSave) {
      const exists = inventoryProducts.some(p => p.name.toLowerCase() === item.name.trim().toLowerCase());
      if (!exists) {
        setError(`"${item.name}" bunday mahsulot yo'q!`);
        return null;
      }
    }

    if (!receiver.trim()) {
      setError("Qabul qiluvchi ismini kiriting!");
      return null;
    }

    return itemsToSave;
  };

  const saveInvoice = async () => {
    setError('');
    const itemsToSave = validateData();
    if (!itemsToSave) return;

    try {
      // Mahsulot o'zgarishlarini hisoblash (diff logic)
      const productChanges = {}; // { productName: { deltaQty: 0, lastUnit: '', lastPrice: 0 } }

      // 1. Eski holatni ayiramiz (agar tahrirlash bo'lsa)
      if (editingId) {
        originalItems.forEach(item => {
          const name = item.name.trim().toLowerCase();
          const { qty } = getNormalizedData(item);
          if (!productChanges[name]) productChanges[name] = { deltaQty: 0 };
          productChanges[name].deltaQty -= qty;
        });
      }

      // 2. Yangi holatni qo'shamiz
      itemsToSave.forEach(item => {
        const name = item.name.trim().toLowerCase();
        const { qty, unit, price } = getNormalizedData(item);
        if (!productChanges[name]) productChanges[name] = { deltaQty: 0 };
        productChanges[name].deltaQty += qty;
        productChanges[name].lastUnit = unit;
        productChanges[name].lastPrice = price;
      });

      // 3. Omborga yuboramiz
      for (const [name, data] of Object.entries(productChanges)) {
        const product = inventoryProducts.find(p => p.name.toLowerCase() === name);
        if (product) {
          // data.deltaQty kg/litr/dona da berilgan. Ombor miqdorini (quantity) o'zgartirish uchun
          // uni birlik og'irligiga (piece_weight_kg) bo'lishimiz kerak.
          const pieceWeight = parseFloat(product.piece_weight_kg) || 1;
          const deltaInPieces = data.deltaQty / pieceWeight;
          
          const updatedQty = (parseFloat(product.quantity) || 0) + deltaInPieces;
          
          await productAPI.update(product.id, {
            ...product,
            unit: data.lastUnit || product.unit,
            purchase_price: data.lastPrice !== undefined ? data.lastPrice : product.purchase_price,
            quantity: updatedQty
          });
        }
      }

      // Inventar holatini yangilash
      fetchInventory();

      const newInvoice = {
        id: editingId || Date.now(),
        date: invoiceDate,
        receiver: receiver,
        items: itemsToSave,
      };

      let updatedInvoices;
      if (editingId) {
        updatedInvoices = invoices.map(inv => inv.id === editingId ? newInvoice : inv);
      } else {
        updatedInvoices = [newInvoice, ...invoices];
      }

      setInvoices(updatedInvoices);
      localStorage.setItem('oshxona_invoices', JSON.stringify(updatedInvoices));
      closeModal();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      setError("Ma'lumotlarni saqlashda xatolik yuz berdi");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError('');
    setCurrentRow([{ id: Date.now(), name: '', unit: 'Kg', quantity: '', extra1: '', extra2: '' }]);
    setOriginalItems([]);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setReceiver('Mirzokir');
    setActiveDropdownIndex(null);
  };

  const handleDeleteClick = (id) => {
    setInvoiceToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      const invoice = invoices.find(inv => inv.id === invoiceToDelete);
      if (invoice) {
        try {
          // Mahsulotlarni ombordan ayirish
          for (const item of invoice.items) {
            const name = item.name.trim().toLowerCase();
            const { qty } = getNormalizedData(item);
            
            const product = inventoryProducts.find(p => p.name.toLowerCase() === name);
            if (product) {
              const pieceWeight = parseFloat(product.piece_weight_kg) || 1;
              const deltaInPieces = qty / pieceWeight;
              const updatedQty = (parseFloat(product.quantity) || 0) - deltaInPieces;

              await productAPI.update(product.id, {
                ...product,
                quantity: updatedQty
              });
            }
          }

          // Inventar holatini yangilash
          fetchInventory();

          const updated = invoices.filter(inv => inv.id !== invoiceToDelete);
          setInvoices(updated);
          localStorage.setItem('oshxona_invoices', JSON.stringify(updated));
        } catch (err) {
          console.error("O'chirishda xatolik:", err);
        }
      }
      setIsConfirmOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const openInvoice = async (inv) => {
    await fetchInventory(); // Omborning eng so'nggi holatini olamiz
    setEditingId(inv.id);
    setCurrentRow(JSON.parse(JSON.stringify(inv.items)));
    setOriginalItems(JSON.parse(JSON.stringify(inv.items)));
    setReceiver(inv.receiver);
    setInvoiceDate(inv.date);
    setShowModal(true);
  };

  const printInvoice = (inv) => {
    setCurrentRow(inv.items);
    setReceiver(inv.receiver);
    setInvoiceDate(inv.date);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setCurrentRow([{ id: Date.now(), name: '', unit: 'Kg', quantity: '', extra1: '', extra2: '' }]);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setReceiver('Mirzokir');
    }, 500);
  };

  const handlePrint = () => {
    setError('');
    if (validateData()) {
      window.print();
    }
  };

  // Jami summani hisoblash
  const totalAmount = currentRow.reduce((sum, row) => {
    const val = parseFloat(String(row.extra2).replace(/,/g, ''));
    return isNaN(val) ? sum : sum + val;
  }, 0);

  const hasTotals = currentRow.some(row => {
    const val = String(row.extra2).replace(/,/g, '').trim();
    return val !== '' && !isNaN(parseFloat(val));
  });

  const displayTotal = hasTotals ? formatNumber(Number.isInteger(totalAmount) ? totalAmount.toString() : totalAmount.toFixed(2).replace(/\.?0+$/, '')) : '';

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Nakladnoylar</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Nakladnoy yaratish
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>№</th>
              <th>Sana</th>
              <th>Kimga</th>
              <th>Mahsulotlar soni</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((inv, index) => (
                <tr key={inv.id}>
                  <td>{index + 1}</td>
                  <td>{formatDate(inv.date)}</td>
                  <td>{inv.receiver}</td>
                  <td>{inv.items.length} ta</td>
                  <td className="action-buttons">
                    <button className="btn btn-secondary btn-small" onClick={() => openInvoice(inv)}>
                      ✏️ Tahrirlash
                    </button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDeleteClick(inv.id)}>
                      🗑️ O'chirish
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => printInvoice(inv)}>
                      🖨️ Chop etish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  Hozircha nakladnoylar yo'q. Yangi yaratish tugmasini bosing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="O'chirishni tasdiqlang"
        message="Ushbu nakladnoyni o'chirmoqchisiz?"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {(showModal || isPrinting) && (
        <div className={`modal-overlay ${isPrinting ? 'is-printing' : ''}`}>
          <div className="modal-content" style={{ maxWidth: '1200px', width: '95%' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Nakladnoyni tahrirlash' : 'Yangi Nakladnoy'}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            {/* Xatolik xabari */}
            {error && (
              <div className="invoice-error-banner" style={{ 
                padding: '12px', 
                margin: '10px 20px 0 20px', 
                borderRadius: '6px'
              }}>
                ⚠️ {error}
              </div>
            )}

            <div className="modal-body" style={{ overflowX: 'auto' }}>
              <div className="invoice-paper invoice-screen-paper" style={{ boxShadow: 'none', width: '100%', minHeight: 'auto', padding: '20px' }}>
                <div className="invoice-header">
                  <div className="invoice-title-row">
                    <div className="date-picker-group">
                      <label className="date-label">Sanani tanlang</label>
                      <div 
                        className="date-input-wrapper"
                        onClick={() => {
                          if (dateInputRef.current) {
                            try {
                              dateInputRef.current.showPicker();
                            } catch (err) {
                              dateInputRef.current.focus();
                            }
                          }
                        }}
                      >
                        <span className="date-display">{formatDate(invoiceDate)}</span>
                        <span className="calendar-icon">📅</span>
                        <input 
                          ref={dateInputRef}
                          type="date" 
                          className="hidden-date-input" 
                          value={invoiceDate} 
                          onChange={(e) => setInvoiceDate(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="invoice-type-wrapper">
                      <div className="invoice-type">Kirim</div>
                    </div>
                    <div className="receiver-section">
                      <input type="text" className="receiver-input" value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Kimga..." />
                    </div>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th className="col-no">№</th>
                      <th className="col-name">Nomi</th>
                      <th className="col-unit">Birligi</th>
                      <th className="col-qty">Miqdori</th>
                      <th className="col-empty">Narxi</th>
                      <th className="col-empty">Umumiy</th>
                      <th className="col-action no-print"></th>
                    </tr>
                  </thead>
                  <tbody ref={dropdownContainerRef}>
                    {currentRow.map((row, index) => (
                      <tr key={row.id || index}>
                        <td className="text-center">{index + 1}</td>
                        <td style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            value={row.name} 
                            onChange={(e) => handleInputChange(index, 'name', e.target.value)} 
                            onFocus={() => setActiveDropdownIndex(index)}
                          />
                          {activeDropdownIndex === index && row.name.trim() !== '' && (
                            <div className="invoice-dropdown">
                              {inventoryProducts
                                .filter(p => p.name.toLowerCase().includes(row.name.toLowerCase()))
                                .map(p => (
                                  <div 
                                    key={p.id} 
                                    className="invoice-dropdown-item"
                                    onClick={() => {
                                      const newRows = [...currentRow];
                                      newRows[index].name = p.name;
                                      // Ombor birligi va narxini to'ldiramiz, lekin dropdown birliklariga moslaymiz
                                      const pUnit = p.unit.toLowerCase();
                                      if (pUnit === 'kg') newRows[index].unit = 'Kg';
                                      else if (pUnit === 'litr') newRows[index].unit = 'Litr';
                                      else if (pUnit === 'dona') newRows[index].unit = 'Dona';
                                      else if (pUnit === 'paket') newRows[index].unit = 'Paket';
                                      else newRows[index].unit = p.unit;

                                      newRows[index].extra1 = p.purchase_price.toString();
                                      
                                      // Avtomatik hisoblash: Miqdori * Narxi = Jami
                                      const qtyVal = String(newRows[index].quantity).replace(/,/g, '');
                                      const qty = parseFloat(qtyVal);
                                      if (!isNaN(qty)) {
                                        let total = qty * p.purchase_price;
                                        // Dropdown'dan tanlaganda ham birlikni tekshiramiz
                                        if (newRows[index].unit === 'G' || newRows[index].unit === 'mL') {
                                          total = total / 1000;
                                        }
                                        newRows[index].extra2 = Number.isInteger(total) ? total.toString() : total.toFixed(2).replace(/\.?0+$/, '');
                                      }
                                      
                                      setCurrentRow(newRows);
                                      setActiveDropdownIndex(null);
                                    }}
                                  >
                                    {p.name}
                                  </div>
                                ))}
                              {inventoryProducts.filter(p => p.name.toLowerCase().includes(row.name.toLowerCase())).length === 0 && (
                                <div className="invoice-dropdown-item disabled">Mahsulot topilmadi</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <select 
                            value={row.unit} 
                            onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td><input type="text" value={formatNumber(row.quantity)} onChange={(e) => handleInputChange(index, 'quantity', e.target.value)} /></td>
                        <td><input type="text" value={formatNumber(row.extra1)} onChange={(e) => handleInputChange(index, 'extra1', e.target.value)} /></td>
                        <td><input type="text" value={formatNumber(row.extra2)} onChange={(e) => handleInputChange(index, 'extra2', e.target.value)} /></td>
                        <td className="no-print text-center">
                          <button className="row-delete-btn" onClick={() => removeRow(index)} title="Qatorni o'chirish">
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ textAlign: 'center', marginTop: '10px' }} className="no-print">
                  <button className="btn btn-secondary" onClick={addRow}>
                    ➕ Qator qo'shish
                  </button>
                </div>

                <div className="invoice-total-wrapper">
                  <div className="invoice-total-label">Jami:</div>
                  <div className="invoice-total-value">{displayTotal}{displayTotal && " so'm"}</div>
                </div>

                <div className="invoice-footer">
                  <div className="footer-row">
                    <div className="signature-section">
                      Tasdiqladi: <span className="signature-line"></span>
                    </div>
                    <div className="signature-section">
                      Qabul qildi: <span className="signature-line"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="invoice-paper invoice-print-paper">
                <div className="invoice-header">
                  <div className="invoice-title-row">
                    <div className="print-date">{formatDate(invoiceDate)}</div>
                    <div className="invoice-type-wrapper">
                      <div className="invoice-type">Kirim</div>
                    </div>
                    <div className="print-receiver">{receiver}</div>
                  </div>
                </div>

                <table className="invoice-table invoice-print-table">
                  <colgroup>
                    <col className="print-col-no" />
                    <col className="print-col-name" />
                    <col className="print-col-unit" />
                    <col className="print-col-qty" />
                    <col className="print-col-price" />
                    <col className="print-col-total" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Nomi</th>
                      <th>Birligi</th>
                      <th>Miqdori</th>
                      <th>Narxi</th>
                      <th>Umumiy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRow.map((row, index) => (
                      <tr key={`print-${row.id || index}`}>
                        <td className="text-center">{index + 1}</td>
                        <td>{row.name}</td>
                        <td className="text-center">{row.unit}</td>
                        <td>{formatNumber(row.quantity)}</td>
                        <td>{formatNumber(row.extra1)}</td>
                        <td>{formatNumber(row.extra2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="invoice-total-wrapper">
                  <div className="invoice-total-label">Jami:</div>
                  <div className="invoice-total-value">{displayTotal}{displayTotal && " so'm"}</div>
                </div>

                <div className="invoice-footer">
                  <div className="footer-row">
                    <div className="signature-section">
                      Tasdiqladi: <span className="signature-line"></span>
                    </div>
                    <div className="signature-section">
                      Qabul qildi: <span className="signature-line"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handlePrint} style={{ marginRight: 'auto' }}>
                🖨️ Chop etish
              </button>
              <button className="btn btn-secondary" onClick={closeModal} style={{ marginRight: '10px' }}>
                Bekor qilish
              </button>
              <button className="btn btn-success" onClick={saveInvoice}>{editingId ? '💾 Saqlash' : '💾 Saqlash'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
