import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildDb, DbError, type CsvName } from '../src/data/build-db';

const names: CsvName[] = ['vehicles', 'locations', 'items', 'stock', 'categories'];
const files = Object.fromEntries(names.map((n) => [n, readFileSync(`data/${n}.csv`, 'utf-8')])) as Record<CsvName, string>;
try {
  const db = buildDb(files);
  mkdirSync('src/generated', { recursive: true });
  writeFileSync('src/generated/db.json', JSON.stringify(db));
  console.log(`db.json: ${db.items.length} items, ${db.stock.length} stock rows`);
} catch (e) {
  if (e instanceof DbError) {
    console.error(`データエラー ${e.message}`);
    process.exit(1);
  }
  throw e;
}
