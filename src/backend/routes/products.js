const express = require('express');
const { getAll, getOne, runQuery } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const { validateProduct, validateProductUpdate, validateMovement } = require('../middleware/validation');

const router = express.Router();

// Middleware: todas as rotas de produto precisam de autenticação
router.use(authenticateToken);

/**
 * ROTAS FIXAS / ESPECÍFICAS
 */

// GET /api/products/categories - Listar categorias disponíveis
router.get('/categories', async (req, res) => {
  try {
    const categories = await getAll('SELECT DISTINCT categoria FROM produtos ORDER BY categoria');
    res.json(categories.map(cat => cat.categoria));
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/movements/all - Listar todas as movimentações
router.get('/movements/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (tipo && (tipo === 'entrada' || tipo === 'saida')) {
      whereClause = 'WHERE m.tipo = ?';
      queryParams.push(tipo);
    }

    const movements = await getAll(`
      SELECT m.*, p.nome as produto_nome, u.nome as usuario_nome
      FROM movimentacoes m
      LEFT JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN users u ON m.usuario_id = u.id
      ${whereClause}
      ORDER BY m.data_movimentacao DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    const countQuery = `SELECT COUNT(*) as total FROM movimentacoes m ${whereClause}`;
    const totalResult = await getOne(countQuery, queryParams);

    res.json({
      movements,
      total: totalResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(totalResult.total / limit)
    });

  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * ROTAS COM PARÂMETROS DINÂMICOS
 */

// GET /api/products/:id/movements - Listar movimentações de um produto
router.get('/:id/movements', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const product = await getOne('SELECT nome FROM produtos WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const movements = await getAll(`
      SELECT m.*, u.nome as usuario_nome
      FROM movimentacoes m
      LEFT JOIN users u ON m.usuario_id = u.id
      WHERE m.produto_id = ?
      ORDER BY m.data_movimentacao DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    const totalResult = await getOne('SELECT COUNT(*) as total FROM movimentacoes WHERE produto_id = ?', [id]);

    res.json({
      movements,
      product_name: product.nome,
      total: totalResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(totalResult.total / limit)
    });

  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/:id - Buscar produto específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getOne('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * ROTAS DE CRUD
 */

// GET /api/products - Listar produtos com filtros
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', categoria = '', lowStock = false, sortBy = 'nome', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(nome LIKE ? OR descricao LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    if (categoria) {
      whereConditions.push('categoria = ?');
      queryParams.push(categoria);
    }
    if (lowStock === 'true') {
      whereConditions.push('quantidade <= 5');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const allowedSortFields = ['nome', 'categoria', 'quantidade', 'preco_venda', 'data_criacao'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'nome';
    const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const query = `
      SELECT id, nome, categoria, quantidade, preco_compra, preco_venda, descricao, data_criacao, data_atualizacao
      FROM produtos 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const products = await getAll(query, [...queryParams, parseInt(limit), parseInt(offset)]);
    const countQuery = `SELECT COUNT(*) as total FROM produtos ${whereClause}`;
    const totalResult = await getOne(countQuery, queryParams);

    res.json({
      products,
      total: totalResult.total,
      page: parseInt(page),
      totalPages: Math.ceil(totalResult.total / limit),
      filters: { search, categoria, lowStock, sortBy: safeSortBy, sortOrder: safeSortOrder }
    });

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/products - Criar novo produto
router.post('/', validateProduct, async (req, res) => {
  try {
    const { nome, categoria, quantidade, preco_compra, preco_venda, descricao } = req.body;
    const existingProduct = await getOne('SELECT id FROM produtos WHERE nome = ?', [nome]);
    if (existingProduct) return res.status(400).json({ error: 'Já existe um produto com este nome' });

    const result = await runQuery(
      `INSERT INTO produtos (nome, categoria, quantidade, preco_compra, preco_venda, descricao) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, categoria, quantidade, preco_compra || null, preco_venda || null, descricao || null]
    );

    if (quantidade > 0) {
      await runQuery(
        'INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [result.id, 'entrada', quantidade, 'Estoque inicial', req.user.id]
      );
    }

    const newProduct = await getOne('SELECT * FROM produtos WHERE id = ?', [result.id]);

    res.status(201).json({ message: 'Produto criado com sucesso', product: newProduct });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Já existe um produto com este nome' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/products/:id - Atualizar produto
router.put('/:id', validateProductUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, categoria, quantidade, preco_compra, preco_venda, descricao } = req.body;

    const existingProduct = await getOne('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });

    if (nome) {
      const nameExists = await getOne('SELECT id FROM produtos WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) return res.status(400).json({ error: 'Já existe um produto com este nome' });
    }

    let updateFields = [];
    let updateValues = [];

    if (nome) { updateFields.push('nome = ?'); updateValues.push(nome); }
    if (categoria) { updateFields.push('categoria = ?'); updateValues.push(categoria); }
    if (typeof quantidade === 'number') {
      const diferenca = quantidade - existingProduct.quantidade;
      if (diferenca !== 0) {
        await runQuery(
          'INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
          [id, diferenca > 0 ? 'entrada' : 'saida', Math.abs(diferenca), diferenca > 0 ? 'Ajuste de estoque - entrada' : 'Ajuste de estoque - saída', req.user.id]
        );
      }
      updateFields.push('quantidade = ?'); updateValues.push(quantidade);
    }
    if (typeof preco_compra === 'number') { updateFields.push('preco_compra = ?'); updateValues.push(preco_compra); }
    if (typeof preco_venda === 'number') { updateFields.push('preco_venda = ?'); updateValues.push(preco_venda); }
    if (descricao !== undefined) { updateFields.push('descricao = ?'); updateValues.push(descricao); }

    if (updateFields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    updateFields.push('data_atualizacao = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await runQuery(`UPDATE produtos SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    const updatedProduct = await getOne('SELECT * FROM produtos WHERE id = ?', [id]);
    res.json({ message: 'Produto atualizado com sucesso', product: updatedProduct });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Já existe um produto com este nome' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/products/:id - Excluir produto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o produto existe
    const existingProduct = await getOne('SELECT id, nome FROM produtos WHERE id = ?', [id]);
    if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });

    // Deleta o produto
    await runQuery('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ message: `Produto ${existingProduct.nome} foi excluído com sucesso` });

  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// PUT /api/products/:id/deactivate - "Desativar" produto
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await getOne('SELECT id, nome FROM produtos WHERE id = ?', [id]);
    if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });

    // Aqui não tem como marcar como desativado, então apenas retornamos mensagem
    res.json({ message: `Produto ${existingProduct.nome} não pode ser desativado porque a funcionalidade não existe no banco.` });

  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// PUT /api/products/:id/deactivate - Desativar produto
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await getOne('SELECT id, nome, ativo FROM produtos WHERE id = ?', [id]);
    if (!existingProduct) return res.status(404).json({ error: 'Produto não encontrado' });
    if (!existingProduct.ativo) return res.status(400).json({ error: 'Produto já está desativado' });

    await runQuery('UPDATE produtos SET ativo = 0 WHERE id = ?', [id]);

    res.json({ message: `Produto ${existingProduct.nome} foi desativado com sucesso` });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/products/:id/movement - Registrar movimentação
router.post('/:id/movement', validateMovement, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, quantidade, motivo } = req.body;

    const product = await getOne('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    if (tipo === 'saida' && product.quantidade < quantidade) return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${product.quantidade}, Solicitado: ${quantidade}` });

    await runQuery('INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [id, tipo, quantidade, motivo || null, req.user.id]);

    const novaQuantidade = tipo === 'entrada' ? product.quantidade + quantidade : product.quantidade - quantidade;
    await runQuery('UPDATE produtos SET quantidade = ?, data_atualizacao = CURRENT_TIMESTAMP WHERE id = ?', [novaQuantidade, id]);

    const updatedProduct = await getOne('SELECT * FROM produtos WHERE id = ?', [id]);

    res.json({
      message: `Movimentação de ${tipo} registrada com sucesso`,
      product: updatedProduct,
      movement: { tipo, quantidade, motivo, quantidade_anterior: product.quantidade, quantidade_atual: novaQuantidade }
    });

  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
