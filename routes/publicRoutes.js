const express = require('express');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/test', authController.test);

router.get('/find/:userIdentifier', authController.findByUserIdentifier);
router.get('/authenticate/:userId', authController.authenticate);
router.post('/signup', authController.signup);
router.get('/veifyEmail/:token', authController.veifyEmail);

router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.get('/resetPassword/:token', authController.veifyResetPassword);

module.exports = router;
