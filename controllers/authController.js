const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const authService = require('./../service/auth.service');

const { TOKEN_TYPE } = require('../consts/AuthConstants');
const { USER_STATUS } = require('../consts/UserConstants');

exports.findByUserIdentifier = catchAsync(async (req, res, next) => {
    const { userIdentifier } = req.params;

    // 1) Check if user exists
    const user = await User.findOne({ phone : userIdentifier }).select('+password');
    if (!user) {
        return next(new AppError('There is no user with email address or phone number.', 401));
    }

    if(!user.password) {
        return next(new AppError('User activation pending (password not set yet)', 401));
    }

    const { _id, name, email, phone, photo, role, status } = user;
    res.status(200).json({
        status: 'success',
        data: { _id, name, email, phone, photo, role, status }
    });
});

exports.authenticate = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    // 1) Check if user exists
    const user = await User.findOne({ _id : userId }).select('+password');
    if (!user) {
        return next(new AppError('There is no user with email address or phone number.', 401));
    }

    if(!user.password) {
        return next(new AppError('User activation pending (password not set yet)', 401));
    }

    const { _id, name, email, phone, photo, role, status } = user;
    res.status(200).json({
        status: 'success',
        data: { _id, name, email, phone, photo, role, status }
    });
});

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email } = req.body;
    const newUser = await User.create({ name, email });
    const token = newUser.createAccountActivationToken();
    await newUser.save({ validateBeforeSave: false });

    const url = `${req.protocol}://${req.get('host')}/api/veifyEmail/${token}`;
    await new Email(newUser, url).sendWelcome();

    // authService().createSendToken(TOKEN_TYPE.SIGN_UP, newUser, 201, req, res);

    res.status(201).json({
        status: 'success',
        message: 'User created. Please verify your email.',
        data: {
            name: newUser.name,
        }
    });
});

exports.veifyEmail = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    // 2) If token has not expired, and there is user, set the new password
    const user = await User.findOne({
        accountActivationToken: hashedToken,
        accountActivationExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    // 3) Update changedPasswordAt property for the user
    user.status = USER_STATUS.ACTIVE;
    user.accountActivateAt = Date.now();
    user.accountActivationToken = undefined;
    user.accountActivationExpires = undefined;
    await user.save();

    // 4) Log the user in, send JWT
    authService.createSendToken(TOKEN_TYPE.VERIFICATION, user, 200, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return next(new AppError('There is no user with email address.', 401));
    }

    if(!user.password) {
        return next(new AppError('User activation pending (password not set yet)', 401));
    }

    // 2) Check password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect password', 401));
    }

    // 3) If everything ok, send token to client
    authService.createSendToken(TOKEN_TYPE.LOGIN, user, 200, req, res);
});

exports.logout = catchAsync(async (req, res, next) => {

});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    try {
        const url = `${req.protocol}://${req.get('host')}/api/resetPassword/${resetToken}`;
        // const url = `${req.protocol}://${process.env.FRONT_END_SERVER}/resetpassword/${resetToken}`;
          await new Email(user, url).sendPasswordReset();
      
          res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
          });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
    
        return next(
          new AppError('There was an error sending the email. Try again later!'),
          500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    if (req.type == TOKEN_TYPE.VERIFICATION) {
        const user = await User.findOne({
            email: req.user.email,
        });
        const { password, confirmPassword } = req.body;
        user.password = password;
        user.passwordConfirm = confirmPassword;

        await user.save();

        authService.createSendToken(TOKEN_TYPE.RESET_PASSWORD, req.user, 200, req, res);
    } else
        return next(new AppError('Invalid token!', 401));  
});

exports.veifyResetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Log the user in, send JWT
    authService.createSendToken(TOKEN_TYPE.VERIFICATION, user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    if (req.type == TOKEN_TYPE.LOGIN) {
        // 1) Get user from collection
        const user = await User.findById(req.user.id).select('+password');

        // 2) Check if POSTed current password is correct
        if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
            return next(new AppError('Your current password is wrong.', 401));
        }

        // 3) If so, update password
        user.password = req.body.password;
        user.passwordConfirm = req.body.confirmPassword;
        await user.save();
        // User.findByIdAndUpdate will NOT work as intended!

        // 4) Log user in, send JWT
        authService.createSendToken(TOKEN_TYPE.LOGIN, user, 200, req, res);
    } else
        return next(new AppError('Invalid token!', 401));     
});