require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { initializeDatabase } = require('./database/db');

const productRoutes = require('./routes/products');
const recipeRoutes = require('./routes/recipes');
const logRoutes = require('./routes/logs');
const consumptionRoutes = require('./routes/consumption');
const wastageRoutes = require('./routes/wastage');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors());
app.use(bodyParser.json());

initializeDatabase();

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/products', productRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/wastage', wastageRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Topilmadi' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Serverdagi ichki xatolik' });
});

const port = parseInt(process.env.PORT || '5000', 10);
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.on('Xato', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${port} band (EADDRINUSE). Boshqa PORT tanlang yoki eski processni to'xtating.`);
    process.exit(1);
  }
  console.error('Server xatosi:', error);
  process.exit(1);
});
