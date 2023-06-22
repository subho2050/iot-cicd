const { promisify } = require( 'util')
const jwt = require( 'jsonwebtoken')

const catchAsync = require( './../utils/catchAsync')
const AppError = require( './../utils/appError')
const User = require( './../models/userModel')

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.body.token) {
        token = req.body.token
        delete req.query.token
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
  
    if (!token) {
      return next(
        new AppError('No Authorization was found! Please log in to get access.', 401)
      );
    }
  
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }
  
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }
  
    // GRANT ACCESS TO PROTECTED ROUTE
    req.type = decoded.type;
    req.user = currentUser;
    res.locals.user = currentUser;
    return next();
})
