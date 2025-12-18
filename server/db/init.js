import { query } from './index.js';

const schema = `
DROP TABLE IF EXISTS vitals_daily;
DROP TABLE IF EXISTS vitals_summaries;

CREATE TABLE vitals_summaries (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  summary_date DATE NOT NULL,
  steps INTEGER,
  avg_heart_rate FLOAT,
  calories FLOAT,
  distance_km FLOAT,
  sleep_minutes INTEGER,
  active_minutes INTEGER,
  weight_kg FLOAT,
  bp_systolic FLOAT,
  bp_diastolic FLOAT,
  blood_glucose FLOAT,
  body_temp FLOAT,
  oxygen_sat FLOAT,
  respiratory_rate FLOAT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, summary_date)
);

CREATE TABLE IF NOT EXISTS vitals_daily (
  id SERIAL PRIMARY KEY,
  summary_id INTEGER REFERENCES vitals_summaries(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  avg_heart_rate FLOAT,
  calories FLOAT,
  distance_km FLOAT,
  sleep_minutes INTEGER,
  active_minutes INTEGER,
  weight_kg FLOAT,
  bp_systolic FLOAT,
  bp_diastolic FLOAT,
  blood_glucose FLOAT,
  body_temp FLOAT,
  oxygen_sat FLOAT,
  respiratory_rate FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, date)
);

CREATE INDEX IF NOT EXISTS idx_vitals_summaries_lookup ON vitals_summaries(device_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_vitals_daily_lookup ON vitals_daily(device_id, date);
`;

async function init() {
  try {
    console.log('Initializing database schema...');
    await query(schema);
    console.log('Database schema initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

init();
