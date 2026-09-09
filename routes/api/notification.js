const express = require('express');
const router = express.Router();

const mail = require('../../services/mail');
const orderConfirmationTemplate = require('../../templates/orderConfirmation');

// Internal endpoint, called by commerce_server (fire-and-forget) right
// after an order is placed — see commerce_server/routes/api/order.js's
// sendOrderConfirmationEmail. Not authenticated: this is a service-to-service
// call within the same trusted deployment, not a client-facing route. Takes
// the already-computed { user, order } payload so this service never needs
// its own DB round trip for order data it doesn't own.
router.post('/order-confirmation', async (req, res) => {
  try {
    const { user, order } = req.body;

    if (!user?.email || !order?._id) {
      return res.status(400).json({ error: 'user.email and order are required.' });
    }

    await mail.sendMail({
      to: user.email,
      subject: `Order Confirmation - #${order._id}`,
      html: orderConfirmationTemplate({ user, order })
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

module.exports = router;
