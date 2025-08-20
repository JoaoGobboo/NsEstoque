const express = require('express');
const bcrypt = require('bcryptjs');
const { getOne } = require('../database/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

const router = express.Router();

// POST /api/auth/login - Fazer login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário no banco
    const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar se usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário desativado. Entre em contato com o administrador.' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = generateToken(user);

    // Retornar dados do usuário (sem senha) e token
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        data_criacao: user.data_criacao
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout - Fazer logout
router.post('/logout', (req, res) => {
  // No JWT, o logout é feito no client removendo o token
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/verify - Verificar se token é válido
router.get('/verify', authenticateToken, (req, res) => {
  // Se chegou até aqui, o token é válido
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      nome: req.user.nome,
      email: req.user.email,
      tipo: req.user.tipo
    }
  });
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      nome: req.user.nome,
      email: req.user.email,
      tipo: req.user.tipo
    }
  });
});

module.exports = router;