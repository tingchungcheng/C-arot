import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { DrawnCard } from '@/lib/tarot/deck';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'carot.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    question TEXT NOT NULL,
    language TEXT DEFAULT 'zh',
    status TEXT DEFAULT 'created',
    created_at INTEGER NOT NULL,
    birth_data TEXT
  );

  CREATE TABLE IF NOT EXISTS reading_cards (
    id TEXT PRIMARY KEY,
    reading_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    position_label TEXT NOT NULL,
    orientation TEXT NOT NULL,
    FOREIGN KEY (reading_id) REFERENCES readings(id),
    UNIQUE(reading_id, position)
  );

  CREATE TABLE IF NOT EXISTS interpretations (
    id TEXT PRIMARY KEY,
    reading_id TEXT UNIQUE NOT NULL,
    full_interpretation TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (reading_id) REFERENCES readings(id)
  );

  CREATE TABLE IF NOT EXISTS birth_charts (
    id TEXT PRIMARY KEY,
    user_nickname TEXT,
    birth_date TEXT NOT NULL,
    birth_time TEXT,
    birth_place TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timezone TEXT NOT NULL,
    chart_data TEXT NOT NULL,
    interpretation TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export interface Reading {
  id: string;
  topic: string;
  question: string;
  language: string;
  status: string;
  created_at: number;
  birth_data?: string;
}

export interface ReadingCard {
  id: string;
  reading_id: string;
  card_id: string;
  position: number;
  position_label: string;
  orientation: 'upright' | 'reversed';
}

export interface Interpretation {
  id: string;
  reading_id: string;
  full_interpretation: string;
  created_at: number;
}

export interface BirthChart {
  id: string;
  user_nickname?: string;
  birth_date: string;
  birth_time?: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  chart_data: string;
  interpretation?: string;
  created_at: number;
  updated_at: number;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createReading(
  topic: string,
  question: string,
  cards: DrawnCard[],
  birthData?: any
): string {
  const readingId = generateId();
  const now = Date.now();

  const insertReading = db.prepare(`
    INSERT INTO readings (id, topic, question, language, status, created_at, birth_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReading.run(
    readingId,
    topic,
    question,
    'zh',
    'cards_drawn',
    now,
    birthData ? JSON.stringify(birthData) : null
  );

  const insertCard = db.prepare(`
    INSERT INTO reading_cards (id, reading_id, card_id, position, position_label, orientation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const drawnCard of cards) {
    insertCard.run(
      generateId(),
      readingId,
      drawnCard.card.id,
      drawnCard.position,
      drawnCard.position_label,
      drawnCard.orientation
    );
  }

  return readingId;
}

export function getReading(readingId: string): Reading | undefined {
  const stmt = db.prepare('SELECT * FROM readings WHERE id = ?');
  return stmt.get(readingId) as Reading | undefined;
}

export function getReadingCards(readingId: string): ReadingCard[] {
  const stmt = db.prepare('SELECT * FROM reading_cards WHERE reading_id = ? ORDER BY position');
  return stmt.all(readingId) as ReadingCard[];
}

export function saveInterpretation(readingId: string, interpretation: string): void {
  const interpretationId = generateId();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO interpretations (id, reading_id, full_interpretation, created_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(interpretationId, readingId, interpretation, now);

  const updateReading = db.prepare('UPDATE readings SET status = ? WHERE id = ?');
  updateReading.run('interpretation_ready', readingId);
}

export function getInterpretation(readingId: string): Interpretation | undefined {
  const stmt = db.prepare('SELECT * FROM interpretations WHERE reading_id = ?');
  return stmt.get(readingId) as Interpretation | undefined;
}

export function saveBirthChart(chartData: Omit<BirthChart, 'id' | 'created_at' | 'updated_at'>): string {
  const chartId = generateId();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO birth_charts (id, user_nickname, birth_date, birth_time, birth_place, latitude, longitude, timezone, chart_data, interpretation, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    chartId,
    chartData.user_nickname || null,
    chartData.birth_date,
    chartData.birth_time || null,
    chartData.birth_place,
    chartData.latitude,
    chartData.longitude,
    chartData.timezone,
    chartData.chart_data,
    chartData.interpretation || null,
    now,
    now
  );

  return chartId;
}

export function getLatestBirthChart(): BirthChart | undefined {
  const stmt = db.prepare('SELECT * FROM birth_charts ORDER BY created_at DESC LIMIT 1');
  return stmt.get() as BirthChart | undefined;
}

export function getBirthChart(chartId: string): BirthChart | undefined {
  const stmt = db.prepare('SELECT * FROM birth_charts WHERE id = ?');
  return stmt.get(chartId) as BirthChart | undefined;
}

export function updateBirthChartInterpretation(chartId: string, interpretation: string): void {
  const stmt = db.prepare('UPDATE birth_charts SET interpretation = ?, updated_at = ? WHERE id = ?');
  stmt.run(interpretation, Date.now(), chartId);
}

export { db };
