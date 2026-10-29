import { DataSource } from 'typeorm';

const ready = new WeakSet<DataSource>();

/** Fecho mensal (base da empresa): um mês fechado não aceita lançamentos nem documentos com essa data. */
export async function ensurePeriodClosuresTable(ds: DataSource) {
  if (ready.has(ds)) return;
  await ds.query(`CREATE TABLE IF NOT EXISTS period_closures (
    year INT NOT NULL, month INT NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'CLOSED', reason TEXT,
    "closedBy" VARCHAR(80), "closedAt" TIMESTAMPTZ, "reopenedBy" VARCHAR(80), "reopenedAt" TIMESTAMPTZ, "reopenReason" TEXT,
    PRIMARY KEY (year, month))`);
  ready.add(ds);
}

export async function isMonthClosed(ds: DataSource, date: string): Promise<boolean> {
  await ensurePeriodClosuresTable(ds);
  const [y, m] = String(date).slice(0, 10).split('-').map(Number);
  const rows = await ds.query(`SELECT 1 FROM period_closures WHERE year=$1 AND month=$2 AND status='CLOSED'`, [y, m]);
  return rows.length > 0;
}
