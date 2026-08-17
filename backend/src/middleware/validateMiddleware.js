const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format error to send the first validation message or array
    const message = errors.array()[0].msg;
    return res.status(400).json({ message, errors: errors.array() });
  }
  next();
};

module.exports = validate;
