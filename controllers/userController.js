// const multer = require('multer');
// const sharp = require('sharp');

const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./../utils/handlerFactory');

exports.getMe = catchAsync(async (req, res, next) => {
    req.params.id = req.user.id;
    next();
});

exports.getUser = factory.getOne(User);
