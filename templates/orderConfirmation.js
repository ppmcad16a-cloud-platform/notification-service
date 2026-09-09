// HTML for the order-confirmation email. Styles are all inline rather than
// in a <style> block since most email clients strip external/head styles
// out. Called by routes/api/notification.js's POST /order-confirmation,
// which commerce_server hits over HTTP after placing an order.
const orderConfirmationTemplate = ({ user, order }) => {
  const itemRows = (order.products || [])
    .filter(item => item.status !== 'Cancelled')
    .map(
      item => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;">${
            item.product?.name || 'Product'
          }</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${
            item.quantity
          }</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">$${Number(
            item.totalPrice || 0
          ).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#333333;">
      <h2 style="color:#111111;">Thank you for your order${
        user?.firstName ? `, ${user.firstName}` : ''
      }!</h2>
      <p>Your order <strong>#${order._id}</strong> has been placed successfully.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:2px solid #333333;padding:8px 0;">Item</th>
            <th style="text-align:center;border-bottom:2px solid #333333;padding:8px 0;">Qty</th>
            <th style="text-align:right;border-bottom:2px solid #333333;padding:8px 0;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="text-align:right;padding:2px 0;">Subtotal</td>
          <td style="text-align:right;padding:2px 0;width:100px;">$${Number(
            order.total || 0
          ).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="text-align:right;padding:2px 0;">Tax</td>
          <td style="text-align:right;padding:2px 0;">$${Number(
            order.totalTax || 0
          ).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="text-align:right;padding:6px 0;font-weight:bold;">Total</td>
          <td style="text-align:right;padding:6px 0;font-weight:bold;">$${Number(
            order.totalWithTax ?? order.total ?? 0
          ).toFixed(2)}</td>
        </tr>
      </table>

      <p style="margin-top:24px;">We'll send another update once your order ships.</p>
      <p style="color:#888888;font-size:12px;margin-top:32px;">This is an automated message, please do not reply.</p>
    </div>
  `;
};

module.exports = orderConfirmationTemplate;
