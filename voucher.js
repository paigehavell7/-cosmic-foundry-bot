function handleVoucher(ctx) {
  const code = ctx.message.text.split(" ")[1];

  if (!code) {
    ctx.reply("🎟️ Please provide a voucher code. Example: /voucher GALAXY10");
    return;
  }

  if (code === "GALAXY10") {
    ctx.reply("✅ Voucher redeemed! You received 10 bonus points!");
  } else {
    ctx.reply("❌ Invalid voucher code.");
  }
}

module.exports = { handleVoucher };
