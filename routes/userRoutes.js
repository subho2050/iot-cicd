const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const authPolicy = require('./../utils/auth.policy');

const router = express.Router();


// Protect all routes after this middleware
router.use(authPolicy.protect);

router.patch('/resetPassword', authController.resetPassword);
router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

/*
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);
*/

module.exports = router;
