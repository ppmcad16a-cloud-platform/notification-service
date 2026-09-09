const router = require('express').Router();

const contactRoutes = require('./contact');
const notificationRoutes = require('./notification');

router.use('/contact', contactRoutes);
router.use('/notification', notificationRoutes);

module.exports = router;
