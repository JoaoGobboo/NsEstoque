const express = require('express');
const bcrypt = require('bcryptjs');
const { getAll, getOne, runQuery } = require('../database/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateUser, validateUserUpdate } = require('../middleware/validation');

const router = express.Router();

// Middleware: todas as rotas de usuário precisam de autenticação e admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/users
 * Listar todos os usuários com paginação e busca
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${search}%`;

    const users = await getAll(
      `SELECT id, nome, email, tipo, ativo, data_criacao
       FROM users 
       WHERE nome LIKE ? OR email LIKE ?
       ORDER BY data_criacao DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
    );

    const totalResult = await getOne(
      `SELECT COUNT(*) as total 
       FROM users 
       WHERE nome LIKE ? OR email LIKE ?`,
      [searchTerm, searchTerm]
    );

    res.json({
      users,
      total: totalResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(totalResult.total / limit)
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/users/:id
 * Buscar usuário específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getOne(
      'SELECT id, nome, email, tipo, ativo, data_criacao FROM users WHERE id = ?',
      [id]
    );

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/users
 * Criar novo usuário
 */
router.post('/', validateUser, async (req, res) => {
  try {
    const { nome, email, senha, tipo = 'normal' } = req.body;

    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email já está em uso' });

    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await runQuery(
      'INSERT INTO users (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      [nome, email, hashedPassword, tipo]
    );

    const newUser = await getOne(
      'SELECT id, nome, email, tipo, ativo, data_criacao FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({ message: 'Usuário criado com sucesso', user: newUser });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Email já está em uso' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/users/:id
 * Atualizar usuário
 */
router.put('/:id', validateUserUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, tipo, ativo } = req.body;

    const existingUser = await getOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (parseInt(id) === req.user.id && ativo === false) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
    }

    if (email) {
      const emailExists = await getOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailExists) return res.status(400).json({ error: 'Email já está em uso' });
    }

    const updateFields = [];
    const updateValues = [];

    if (nome) { updateFields.push('nome = ?'); updateValues.push(nome); }
    if (email) { updateFields.push('email = ?'); updateValues.push(email); }
    if (senha) { 
      const hashedPassword = await bcrypt.hash(senha, 10); 
      updateFields.push('senha = ?'); 
      updateValues.push(hashedPassword); 
    }
    if (tipo) { updateFields.push('tipo = ?'); updateValues.push(tipo); }
    if (typeof ativo === 'boolean') { updateFields.push('ativo = ?'); updateValues.push(ativo ? 1 : 0); }

    if (updateFields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    updateValues.push(id);

    await runQuery(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    const updatedUser = await getOne(
      'SELECT id, nome, email, tipo, ativo, data_criacao FROM users WHERE id = ?',
      [id]
    );

    res.json({ message: 'Usuário atualizado com sucesso', user: updatedUser });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Email já está em uso' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/users/:id
 * Desativar usuário (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await getOne('SELECT id, nome FROM users WHERE id = ?', [id]);
    if (!existingUser) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });

    await runQuery('UPDATE users SET ativo = 0 WHERE id = ?', [id]);

    res.json({ message: `Usuário ${existingUser.nome} foi desativado com sucesso` });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/users/:id/activate
 * Reativar usuário
 */
router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await getOne('SELECT id, nome FROM users WHERE id = ?', [id]);
    if (!existingUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    await runQuery('UPDATE users SET ativo = 1 WHERE id = ?', [id]);

    res.json({ message: `Usuário ${existingUser.nome} foi reativado com sucesso` });
  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
