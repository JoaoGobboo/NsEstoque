const { body, validationResult } = require('express-validator');

// Middleware para verificar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validações para login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  
  body('senha')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 1 })
    .withMessage('Senha não pode estar vazia'),
  
  handleValidationErrors
];

// Validações para usuário
const validateUser = [
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos: uma letra minúscula, uma maiúscula e um número'),
  
  body('tipo')
    .optional()
    .isIn(['admin', 'normal'])
    .withMessage('Tipo deve ser "admin" ou "normal"'),
  
  handleValidationErrors
];

// Validações para atualização de usuário
const validateUserUpdate = [
  body('nome')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nome não pode estar vazio')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  
  body('senha')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos: uma letra minúscula, uma maiúscula e um número'),
  
  body('tipo')
    .optional()
    .isIn(['admin', 'normal'])
    .withMessage('Tipo deve ser "admin" ou "normal"'),
  
  body('ativo')
    .optional()
    .isBoolean()
    .withMessage('Campo ativo deve ser true ou false'),
  
  handleValidationErrors
];

// Validações para produto
const validateProduct = [
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('categoria')
    .trim()
    .notEmpty()
    .withMessage('Categoria é obrigatória')
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoria deve ter entre 2 e 50 caracteres'),
  
  body('quantidade')
    .isInt({ min: 0 })
    .withMessage('Quantidade deve ser um número inteiro não negativo'),
  
  body('preco_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço de compra deve ser um número positivo'),
  
  body('preco_venda')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço de venda deve ser um número positivo'),
  
  body('descricao')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição não pode ter mais de 500 caracteres'),
  
  handleValidationErrors
];

// Validações para atualização de produto
const validateProductUpdate = [
  body('nome')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nome não pode estar vazio')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('categoria')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Categoria não pode estar vazia')
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoria deve ter entre 2 e 50 caracteres'),
  
  body('quantidade')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantidade deve ser um número inteiro não negativo'),
  
  body('preco_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço de compra deve ser um número positivo'),
  
  body('preco_venda')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço de venda deve ser um número positivo'),
  
  body('descricao')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição não pode ter mais de 500 caracteres'),
  
  handleValidationErrors
];

// Validações para movimentação
const validateMovement = [
  body('produto_id')
    .isInt({ min: 1 })
    .withMessage('ID do produto deve ser um número válido'),
  
  body('tipo')
    .isIn(['entrada', 'saida'])
    .withMessage('Tipo deve ser "entrada" ou "saida"'),
  
  body('quantidade')
    .isInt({ min: 1 })
    .withMessage('Quantidade deve ser um número inteiro positivo'),
  
  body('motivo')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Motivo não pode ter mais de 255 caracteres'),
  
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateUser,
  validateUserUpdate,
  validateProduct,
  validateProductUpdate,
  validateMovement,
  handleValidationErrors
};