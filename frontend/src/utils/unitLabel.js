export const getUnitLabel = (unit) => {
  if (unit === 'g') return 'g';
  if (unit === 'kg') return 'kg';
  if (unit === 'ml') return 'ml';
  if (unit === 'l' || unit === 'litr' || unit === 'liter') return 'litr';
  if (unit === 'dona') return 'dona';
  if (unit === 'paket') return 'paket';
  return unit;
};

export const formatQuantity = (quantity, unit) => {
  let q = Number(quantity);
  let u = unit;

  // Gram va millitrlarni asosiy birlikka o'tkazamiz
  if (u === 'g') {
    q = q / 1000;
    u = 'kg';
  } else if (u === 'ml') {
    q = q / 1000;
    u = 'l';
  }

  // Round to 3 decimal places and remove trailing zeros
  const formattedQ = Number(q.toFixed(3));
  
  return `${formattedQ} ${getUnitLabel(u)}`;
};

export const toStandardUnit = (quantity, unit) => {
  const q = Number(quantity);
  if (unit === 'g') return q / 1000;
  if (unit === 'ml') return q / 1000;
  return q;
};

export const getStandardUnit = (unit) => {
  if (unit === 'g') return 'kg';
  if (unit === 'ml') return 'l';
  if (unit === 'liter' || unit === 'litr') return 'l';
  return unit;
};
