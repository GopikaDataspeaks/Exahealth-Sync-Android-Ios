import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import { getClient, query } from './db/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.post('/api/v1/vitals', async (req, res) => {
  const { deviceId, platform, summary, daily, syncedAt } = req.body || {};
  if (!deviceId || !summary) {
    return res.status(400).json({ error: 'deviceId and summary are required' });
  }

  const syncDate = (syncedAt || new Date().toISOString()).slice(0, 10);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // UPSERT Summary for the specific device and date
    const summaryRes = await client.query(
      `INSERT INTO vitals_summaries (
        device_id, platform, summary_date, steps, avg_heart_rate, calories, distance_km, 
        sleep_minutes, active_minutes, weight_kg, bp_systolic, bp_diastolic,
        blood_glucose, body_temp, oxygen_sat, respiratory_rate, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      ON CONFLICT (device_id, summary_date) DO UPDATE SET
        steps = EXCLUDED.steps,
        avg_heart_rate = EXCLUDED.avg_heart_rate,
        calories = EXCLUDED.calories,
        distance_km = EXCLUDED.distance_km,
        sleep_minutes = EXCLUDED.sleep_minutes,
        active_minutes = EXCLUDED.active_minutes,
        weight_kg = EXCLUDED.weight_kg,
        bp_systolic = EXCLUDED.bp_systolic,
        bp_diastolic = EXCLUDED.bp_diastolic,
        blood_glucose = EXCLUDED.blood_glucose,
        body_temp = EXCLUDED.body_temp,
        oxygen_sat = EXCLUDED.oxygen_sat,
        respiratory_rate = EXCLUDED.respiratory_rate,
        synced_at = EXCLUDED.synced_at
      RETURNING id`,
      [
        deviceId, platform, syncDate,
        summary.steps || 0,
        summary.averageHeartRate || 0,
        summary.calories || 0,
        summary.distanceKm || 0,
        summary.sleepMinutes || 0,
        summary.activeMinutes || 0,
        summary.weightKg || 0,
        summary.bloodPressureSystolic || 0,
        summary.bloodPressureDiastolic || 0,
        summary.bloodGlucoseMgPerDl || 0,
        summary.bodyTemperatureC || 0,
        summary.oxygenSaturationPercent || 0,
        summary.respiratoryRate || 0,
        syncedAt || new Date().toISOString()
      ]
    );

    const summaryId = summaryRes.rows[0].id;

    // UPSERT Daily entries
    if (daily && Array.isArray(daily)) {
      for (const d of daily) {
        await client.query(
          `INSERT INTO vitals_daily (
            summary_id, device_id, date, steps, avg_heart_rate, calories, distance_km,
            sleep_minutes, active_minutes, weight_kg, bp_systolic, bp_diastolic,
            blood_glucose, body_temp, oxygen_sat, respiratory_rate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (device_id, date) DO UPDATE SET
            summary_id = EXCLUDED.summary_id,
            steps = EXCLUDED.steps,
            avg_heart_rate = EXCLUDED.avg_heart_rate,
            calories = EXCLUDED.calories,
            distance_km = EXCLUDED.distance_km,
            sleep_minutes = EXCLUDED.sleep_minutes,
            active_minutes = EXCLUDED.active_minutes,
            weight_kg = EXCLUDED.weight_kg,
            bp_systolic = EXCLUDED.bp_systolic,
            bp_diastolic = EXCLUDED.bp_diastolic,
            blood_glucose = EXCLUDED.blood_glucose,
            body_temp = EXCLUDED.body_temp,
            oxygen_sat = EXCLUDED.oxygen_sat,
            respiratory_rate = EXCLUDED.respiratory_rate`,
          [
            summaryId, deviceId, d.date,
            d.steps || 0,
            d.averageHeartRate || 0,
            d.calories || 0,
            d.distanceKm || 0,
            d.sleepMinutes || 0,
            d.activeMinutes || 0,
            d.weightKg || 0,
            d.bloodPressureSystolic || 0,
            d.bloodPressureDiastolic || 0,
            d.bloodGlucoseMgPerDl || 0,
            d.bodyTemperatureC || 0,
            d.oxygenSaturationPercent || 0,
            d.respiratoryRate || 0
          ]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ ok: true, id: summaryId });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('[server] Error saving vitals:', err);
    return res.status(500).json({ error: 'Failed to save vitals to database' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/v1/vitals', async (_req, res) => {
  try {
    const summaries = await query('SELECT * FROM vitals_summaries ORDER BY created_at DESC LIMIT 50');
    res.json({ count: summaries.rowCount, data: summaries.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

app.listen(port, () => {
  console.log(`HealthSync backend listening on port ${port}`);
});
