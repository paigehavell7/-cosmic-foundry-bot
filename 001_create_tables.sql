-- Create users, actions, vouchers, voucher_audit tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  credits BIGINT DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by INT REFERENCES users(id),
  wallet_address TEXT,
  snapshot_for_airdrop BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action_type TEXT,
  action_value JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  value INT NOT NULL,
  issued_to_user_id INT REFERENCES users(id),
  issued_by TEXT,
  expires_at TIMESTAMP,
  redeemed_by_user_id INT REFERENCES users(id),
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voucher_audit (
  id SERIAL PRIMARY KEY,
  voucher_id INT REFERENCES vouchers(id),
  action TEXT,
  actor TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);
