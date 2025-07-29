const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
};

// Common validation schemas
const schemas = {
  // User registration
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  // Order creation
  order: Joi.object({
    portfolioId: Joi.number().integer().positive().required().messages({
      'number.base': 'Portfolio ID must be a number',
      'number.positive': 'Portfolio ID must be positive',
      'any.required': 'Portfolio ID is required'
    }),
    symbol: Joi.string().alphanum().min(1).max(10).uppercase().required().messages({
      'string.alphanum': 'Symbol must contain only letters and numbers',
      'string.min': 'Symbol must be at least 1 character',
      'string.max': 'Symbol cannot exceed 10 characters',
      'any.required': 'Symbol is required'
    }),
    orderType: Joi.string().valid('market', 'limit', 'stop', 'stop_limit').required().messages({
      'any.only': 'Order type must be one of: market, limit, stop, stop_limit',
      'any.required': 'Order type is required'
    }),
    side: Joi.string().valid('buy', 'sell').required().messages({
      'any.only': 'Side must be either buy or sell',
      'any.required': 'Side is required'
    }),
    quantity: Joi.number().positive().required().messages({
      'number.base': 'Quantity must be a number',
      'number.positive': 'Quantity must be positive',
      'any.required': 'Quantity is required'
    }),
    price: Joi.number().positive().when('orderType', {
      is: Joi.string().valid('limit', 'stop_limit'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'any.required': 'Price is required for limit and stop limit orders'
    }),
    stopPrice: Joi.number().positive().when('orderType', {
      is: Joi.string().valid('stop', 'stop_limit'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'number.base': 'Stop price must be a number',
      'number.positive': 'Stop price must be positive',
      'any.required': 'Stop price is required for stop and stop limit orders'
    }),
    timeInForce: Joi.string().valid('DAY', 'GTC', 'IOC', 'FOK').default('DAY').messages({
      'any.only': 'Time in force must be one of: DAY, GTC, IOC, FOK'
    })
  }),

  // Portfolio creation
  portfolio: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Portfolio name must be at least 1 character',
      'string.max': 'Portfolio name cannot exceed 100 characters',
      'any.required': 'Portfolio name is required'
    }),
    description: Joi.string().max(500).optional().messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    initialBalance: Joi.number().positive().required().messages({
      'number.base': 'Initial balance must be a number',
      'number.positive': 'Initial balance must be positive',
      'any.required': 'Initial balance is required'
    }),
    currency: Joi.string().length(3).uppercase().default('USD').messages({
      'string.length': 'Currency must be a 3-letter code',
    })
  }),

  // Security search
  securitySearch: Joi.object({
    q: Joi.string().min(1).max(50).required().messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 50 characters',
      'any.required': 'Search query is required'
    })
  }),

  // Watchlist creation
  watchlist: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Watchlist name must be at least 1 character',
      'string.max': 'Watchlist name cannot exceed 100 characters',
      'any.required': 'Watchlist name is required'
    })
  }),

  // Alert creation
  alert: Joi.object({
    symbol: Joi.string().alphanum().min(1).max(10).uppercase().required().messages({
      'string.alphanum': 'Symbol must contain only letters and numbers',
      'string.min': 'Symbol must be at least 1 character',
      'string.max': 'Symbol cannot exceed 10 characters',
      'any.required': 'Symbol is required'
    }),
    alertType: Joi.string().valid('price_above', 'price_below', 'volume_spike').required().messages({
      'any.only': 'Alert type must be one of: price_above, price_below, volume_spike',
      'any.required': 'Alert type is required'
    }),
    conditionValue: Joi.number().positive().required().messages({
      'number.base': 'Condition value must be a number',
      'number.positive': 'Condition value must be positive',
      'any.required': 'Condition value is required'
    })
  }),

  // Password change
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'New password is required'
      })
  }),

  // Profile update
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
  })
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
};

// Validate URL parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
};

module.exports = { validate, validateQuery, validateParams, schemas };