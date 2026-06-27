import { getDb } from './schema';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const db = getDb();

const adminId = uuidv4();
const student1Id = uuidv4();
const student2Id = uuidv4();
const student3Id = uuidv4();

const adminHash = bcrypt.hashSync('admin123', 10);
const studentHash = bcrypt.hashSync('student123', 10);

db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(adminId, 'Admin', 'admin@trading.academy', adminHash, 'admin');
db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(student1Id, 'Nguyen Van An', 'an@student.com', studentHash, 'student');
db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(student2Id, 'Tran Thi Bich', 'bich@student.com', studentHash, 'student');
db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(student3Id, 'Le Minh Cuong', 'cuong@student.com', studentHash, 'student');

// Seed trade journals for student1
const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];
const directions = ['long', 'short'];
const emotions = ['calm', 'confident', 'fearful', 'greedy', 'revenge', 'happy'];

const insertJournal = db.prepare(`
  INSERT OR IGNORE INTO trade_journals
  (id, student_id, date, symbol, direction, entry_price, exit_price, sl, tp, lot_size, pnl, rr_ratio, emotion, discipline_score, notes, type, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 30; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const direction = directions[Math.floor(Math.random() * 2)];
  const entry = parseFloat((1800 + Math.random() * 200).toFixed(2));
  const sl = parseFloat((direction === 'long' ? entry - 10 - Math.random() * 10 : entry + 10 + Math.random() * 10).toFixed(2));
  const tp = parseFloat((direction === 'long' ? entry + 20 + Math.random() * 20 : entry - 20 - Math.random() * 20).toFixed(2));
  const pnl = parseFloat(((Math.random() - 0.4) * 200).toFixed(2));
  const exit = parseFloat((entry + (direction === 'long' ? pnl / 10 : -pnl / 10)).toFixed(2));
  const rr = parseFloat((Math.abs(tp - entry) / Math.abs(sl - entry)).toFixed(2));
  const emotion = emotions[Math.floor(Math.random() * emotions.length)];
  const disc = Math.floor(5 + Math.random() * 5);

  insertJournal.run(uuidv4(), student1Id, dateStr, symbol, direction, entry, exit, sl, tp, 0.1, pnl, rr, emotion, disc, 'Sample trade note', 'idea', pnl > 0 ? 'closed' : 'closed');
}

// Seed trade plans for student1
const insertPlan = db.prepare(`
  INSERT OR IGNORE INTO trade_plans (id, student_id, date, title, market_bias, content, status, grade)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 10; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i * 3);
  const dateStr = date.toISOString().split('T')[0];
  insertPlan.run(uuidv4(), student1Id, dateStr, `Trade Plan ${dateStr}`, i % 2 === 0 ? 'bullish' : 'bearish',
    'Market analysis: Gold is in uptrend. Key levels: 1920 support, 1960 resistance. Plan to buy on pullback.', i < 5 ? 'reviewed' : 'published', i < 5 ? ['A', 'B', 'C', 'A', 'B'][i] : null);
}

console.log('✅ Seed completed!');
console.log('Admin: admin@trading.academy / admin123');
console.log('Student: an@student.com / student123');
console.log('Student: bich@student.com / student123');
console.log('Student: cuong@student.com / student123');
