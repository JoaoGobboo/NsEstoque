const { authenticateToken } = require('./middleware/auth');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importar routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

// Importar database
const { initDatabase } = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas tentativas, tente novamente em 15 minutos'
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: '*', // Em produção, especificar domínios
  credentials: true
}));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
// app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Rota para dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const db = require('./database/database').getDatabase();
    
    const totalProducts = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM produtos', (err, row) => {
        if (err) reject(err);
        resolve(row.count);
      });
    });

    const lowStock = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM produtos WHERE quantidade <= 5', (err, row) => {
        if (err) reject(err);
        resolve(row.count);
      });
    });

    const totalValue = await new Promise((resolve, reject) => {
      db.get('SELECT SUM(quantidade * preco_venda) as total FROM produtos', (err, row) => {
        if (err) reject(err);
        resolve(row.total || 0);
      });
    });

    const categorias = await new Promise((resolve, reject) => {
      db.all('SELECT categoria, COUNT(*) as count FROM produtos GROUP BY categoria', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.json({
      totalProducts,
      lowStock,
      totalValue: parseFloat(totalValue).toFixed(2),
      categorias
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para alertas
app.get('/api/dashboard/alerts', authenticateToken, async (req, res) => {
  try {
    const db = require('./database/database').getDatabase();
    
    const alerts = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, nome, quantidade, categoria 
        FROM produtos 
        WHERE quantidade <= 5 
        ORDER BY quantidade ASC
      `, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.json(alerts);

  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar database e servidor
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database inicializado com sucesso');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratar shutdown graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando servidor...');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;