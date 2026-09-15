// WhatsApp Statement Formatter

export const generateCustomerWhatsAppText = ({
  customerName,
  customerCode,
  dairyName = 'BALAJI DAIRY',
  billDate,
  startDate,
  endDate,
  previousBalance = 0,
  totalLitres = 0,
  milkAmount = 0,
  paymentsReceived = 0,
  adjustments = 0,
  finalPayable = 0,
}) => {
  const text = `🥛 *${dairyName}* — Milk Statement 🥛
━━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName} (#${customerCode})
📅 *Period:* ${startDate} to ${endDate}
📆 *Date:* ${billDate}
━━━━━━━━━━━━━━━━━━━━━
📊 *SUMMARY DETAILS:*
• Previous Balance: ₹${previousBalance.toLocaleString('en-IN')}
• Milk Supplied: ${totalLitres} Litres
• Current Milk Bill: ₹${milkAmount.toLocaleString('en-IN')}
• Payments Received: ₹${paymentsReceived.toLocaleString('en-IN')}
${adjustments > 0 ? `• Adjustments/Discount: ₹${adjustments.toLocaleString('en-IN')}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
💰 *FINAL PAYABLE BALANCE: ₹${finalPayable.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━
🙏 _Thank you for your business!_
_Balaji Dairy Management System_`;

  return encodeURIComponent(text);
};

export const generateSupplierWhatsAppText = ({
  supplierName,
  supplierCode,
  dairyName = 'BALAJI DAIRY',
  date,
  totalMilk = 0,
  totalAmount = 0,
  totalPaid = 0,
  pendingAmount = 0,
}) => {
  const text = `🥛 *${dairyName}* — Farmer Milk Slip 🥛
━━━━━━━━━━━━━━━━━━━━━
👨‍🌾 *Farmer:* ${supplierName} (#${supplierCode})
📆 *Date:* ${date}
━━━━━━━━━━━━━━━━━━━━━
• Total Milk Supplied: ${totalMilk} Litres
• Total Milk Value: ₹${totalAmount.toLocaleString('en-IN')}
• Total Paid: ₹${totalPaid.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━
💰 *PENDING SETTLEMENT: ₹${pendingAmount.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━
🙏 _Shree Balaji Dairy_`;

  return encodeURIComponent(text);
};

export const openWhatsApp = (phone, textEncoded) => {
  let cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${textEncoded}`
    : `https://wa.me/?text=${textEncoded}`;
  window.open(url, '_blank');
};
