const jwt = require('jsonwebtoken');
const { getOne } = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-jwt-secret-super-seguro-aqui';

// Middleware para verificar token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token de acesso requerido' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await getOne('SELECT * FROM users WHERE id = ? AND ativo = 1', [decoded.id]);

    if (!user) return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });

    req.user = { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado' });
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Usuário não autenticado' });
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
  next();
};

// Função para gerar token
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, tipo: user.tipo }, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = { authenticateToken, requireAdmin, generateToken, JWT_SECRET };
