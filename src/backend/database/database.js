const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../database.db');
let db;

// Inicializar banco de dados
async function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erro ao conectar com banco:', err);
        reject(err);
        return;
      }
      console.log('Conectado ao SQLite database');
      
      // Criar tabelas
      createTables()
        .then(() => createDefaultAdmin())
        .then(() => resolve())
        .catch(reject);
    });
  });
}

// Criar tabelas
function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      // Tabela de usuários
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(10) DEFAULT 'normal' CHECK (tipo IN ('admin', 'normal')),
        ativo BOOLEAN DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de produtos
      `CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(100) UNIQUE NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
        preco_compra DECIMAL(10,2),
        preco_venda DECIMAL(10,2),
        descricao TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de movimentações
      `CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
        quantidade INTEGER NOT NULL,
        motivo VARCHAR(255),
        usuario_id INTEGER,
        data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
        FOREIGN KEY (usuario_id) REFERENCES users(id)
      )`
    ];

    let completed = 0;
    const total = queries.length;

    queries.forEach(query => {
      db.run(query, (err) => {
        if (err) {
          console.error('Erro ao criar tabela:', err);
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          console.log('✅ Todas as tabelas criadas com sucesso');
          resolve();
        }
      });
    });
  });
}

// Criar usuário admin padrão
async function createDefaultAdmin() {
  return new Promise((resolve, reject) => {
    // Verificar se já existe admin
    db.get('SELECT id FROM users WHERE email = ?', ['admin@sistema.com'], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        // Criar admin padrão
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        db.run(
          'INSERT INTO users (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
          ['Administrador', 'admin@sistema.com', hashedPassword, 'admin'],
          function(err) {
            if (err) {
              console.error('Erro ao criar admin:', err);
              reject(err);
              return;
            }
            console.log('✅ Usuário admin criado - Email: admin@sistema.com | Senha: Admin@123');
            resolve();
          }
        );
      } else {
        console.log('✅ Usuário admin já existe');
        resolve();
      }
    });
  });
}

// Função para obter instância do banco
function getDatabase() {
  if (!db) {
    throw new Error('Database não foi inicializado');
  }
  return db;
}

// Função para fechar conexão
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Conexão com database fechada');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Função para executar queries com promise
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Função para buscar um registro
function getOne(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Função para buscar múltiplos registros
function getAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll
};