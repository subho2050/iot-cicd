const jwt = require('jsonwebtoken');

const signToken = (type, id) => {
    return jwt.sign({ type, id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
};

exports.createSendToken = (type, user, statusCode, req, res) => {
    const token = signToken(type, user._id);
  
    // Remove _id & password from output
    user._id = undefined;
    user.password = undefined;
  
    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
};