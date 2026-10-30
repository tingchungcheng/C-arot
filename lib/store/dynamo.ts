import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { shuffleDeck, type ShuffledCard } from '@/lib/tarot/draw';

export type CloudHistoryCard = {
  id: string;
  position_label: string;
  orientation: 'upright' | 'reversed';
  name_zh: string;
  name_en?: string;
};

export type CloudHistoryEntry = {
  id: string;
  createdAt: string;
  readingId: string;
  topic?: string;
  question: string;
  cards: CloudHistoryCard[];
  result: string;
};

export type CloudProfile = {
  nickname: string;
  date: string;
  time: string;
  timeUnknown: boolean;
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type CloudReadingCard = {
  id: string;
  position: number;
  position_label: string;
  orientation: 'upright' | 'reversed';
};

export type CloudReading = {
  id: string;
  ownerKey: string;
  topic: string;
  question: string;
  cards: CloudReadingCard[];
  birthData?: unknown;
  interpretation?: string;
  status: 'cards_drawn' | 'interpretation_ready';
  createdAt: number;
  updatedAt: number;
};

export type CloudBirthChart = {
  id: string;
  ownerKey: string;
  user_nickname?: string;
  birth_date: string;
  birth_time?: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  chart_data: string;
  interpretation?: string;
  createdAt: number;
  updatedAt: number;
};

type HistoryItem = CloudHistoryEntry & {
  PK: string;
  SK: string;
  entity: 'history';
  userId: string;
};

let client: DynamoDBDocumentClient | undefined;

function tableName(): string {
  const value = process.env.DYNAMODB_TABLE_NAME?.trim();
  if (!value) throw new Error('Missing DYNAMODB_TABLE_NAME');
  return value;
}

function documentClient() {
  if (!client) {
    client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return client;
}

/** Shared low-level access for other lib/ stores (e.g. the carrot ledger). */
export const dynamoDoc = () => documentClient();
export const dynamoTable = () => tableName();

const partition = (userId: string) => `USER#${userId}`;
const sortKey = (id: string) => `HISTORY#${id}`;
const profileKey = (userId: string) => ({ PK: partition(userId), SK: 'PROFILE' });
const readingPartition = (ownerKey: string) => `OWNER#${ownerKey}`;
const readingSortKey = (id: string) => `READING#${id}`;
const chartSortKey = (id: string) => `CHART#${id}`;
const drawPartition = (drawId: string) => `DRAW#${drawId}`;

export function isDynamoHistoryEnabled(): boolean {
  return process.env.DATA_STORE === 'dynamodb' && !!process.env.DYNAMODB_TABLE_NAME;
}

export const isDynamoReadingsEnabled = isDynamoHistoryEnabled;

export async function createCloudDrawSession(): Promise<{ drawId: string; deckSize: number; expiresAt: number }> {
  const drawId = randomUUID();
  const expiresAt = Date.now() + 30 * 60 * 1000;
  await documentClient().send(new PutCommand({
    TableName: tableName(),
    Item: {
      PK: drawPartition(drawId),
      SK: 'SESSION',
      entity: 'draw',
      drawId,
      deck: shuffleDeck(),
      expiresAt: Math.floor(expiresAt / 1000),
    },
  }));
  return { drawId, deckSize: 78, expiresAt };
}

export async function consumeCloudDrawSession(drawId: string): Promise<ShuffledCard[] | undefined> {
  try {
    const result = await documentClient().send(new DeleteCommand({
      TableName: tableName(),
      Key: { PK: drawPartition(drawId), SK: 'SESSION' },
      ConditionExpression: 'attribute_exists(PK) AND expiresAt > :now',
      ExpressionAttributeValues: { ':now': Math.floor(Date.now() / 1000) },
      ReturnValues: 'ALL_OLD',
    }));
    return result.Attributes?.deck as ShuffledCard[] | undefined;
  } catch (error) {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') return undefined;
    throw error;
  }
}

export async function createCloudReading(reading: Omit<CloudReading, 'status' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now();
  await documentClient().send(new PutCommand({
    TableName: tableName(),
    Item: { ...reading, PK: readingPartition(reading.ownerKey), SK: readingSortKey(reading.id), entity: 'reading', status: 'cards_drawn', createdAt: now, updatedAt: now },
  }));
}

export async function getCloudReading(ownerKey: string, readingId: string): Promise<CloudReading | null> {
  const result = await documentClient().send(new GetCommand({
    TableName: tableName(),
    Key: { PK: readingPartition(ownerKey), SK: readingSortKey(readingId) },
  }));
  if (!result.Item) return null;
  const reading = { ...result.Item };
  delete reading.PK;
  delete reading.SK;
  delete reading.entity;
  return reading as CloudReading;
}

export async function saveCloudReadingInterpretation(ownerKey: string, readingId: string, interpretation: string): Promise<void> {
  await documentClient().send(new UpdateCommand({
    TableName: tableName(),
    Key: { PK: readingPartition(ownerKey), SK: readingSortKey(readingId) },
    UpdateExpression: 'SET interpretation = :interpretation, #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':interpretation': interpretation, ':status': 'interpretation_ready', ':updatedAt': Date.now() },
  }));
}

export async function createCloudBirthChart(ownerKey: string, chart: Omit<CloudBirthChart, 'ownerKey' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now();
  await documentClient().send(new PutCommand({
    TableName: tableName(),
    Item: {
      ...chart,
      ownerKey,
      PK: readingPartition(ownerKey),
      SK: chartSortKey(chart.id),
      entity: 'birth_chart',
      createdAt: now,
      updatedAt: now,
    },
  }));
}

export async function updateCloudBirthChartInterpretation(ownerKey: string, chartId: string, interpretation: string): Promise<void> {
  await documentClient().send(new UpdateCommand({
    TableName: tableName(),
    Key: { PK: readingPartition(ownerKey), SK: chartSortKey(chartId) },
    UpdateExpression: 'SET interpretation = :interpretation, updatedAt = :updatedAt',
    ConditionExpression: 'attribute_exists(PK)',
    ExpressionAttributeValues: { ':interpretation': interpretation, ':updatedAt': Date.now() },
  }));
}

export async function listCloudHistory(userId: string): Promise<CloudHistoryEntry[]> {
  const result = await documentClient().send(new QueryCommand({
    TableName: tableName(),
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': partition(userId), ':prefix': 'HISTORY#' },
    ScanIndexForward: false,
    Limit: 50,
  }));
  return (result.Items || []) as CloudHistoryEntry[];
}

export async function getCloudHistory(userId: string, id: string): Promise<CloudHistoryEntry | null> {
  const result = await documentClient().send(new GetCommand({
    TableName: tableName(),
    Key: { PK: partition(userId), SK: sortKey(id) },
  }));
  return (result.Item as CloudHistoryEntry | undefined) ?? null;
}

export async function putCloudHistory(userId: string, entry: CloudHistoryEntry): Promise<void> {
  const item: HistoryItem = {
    ...entry,
    PK: partition(userId),
    SK: sortKey(entry.id),
    entity: 'history',
    userId,
  };
  await documentClient().send(new PutCommand({ TableName: tableName(), Item: item }));
}

export async function deleteCloudHistory(userId: string, id: string): Promise<void> {
  await documentClient().send(new DeleteCommand({
    TableName: tableName(),
    Key: { PK: partition(userId), SK: sortKey(id) },
  }));
}

export async function getCloudProfile(userId: string): Promise<CloudProfile | null> {
  const result = await documentClient().send(new GetCommand({
    TableName: tableName(),
    Key: profileKey(userId),
  }));
  if (!result.Item) return null;
  const profile = Object.fromEntries(Object.entries(result.Item).filter(([key]) => !['PK', 'SK', 'entity', 'userId', 'updatedAt'].includes(key)));
  return profile as CloudProfile;
}

export async function putCloudProfile(userId: string, profile: CloudProfile): Promise<void> {
  await documentClient().send(new PutCommand({
    TableName: tableName(),
    Item: {
      ...profile,
      ...profileKey(userId),
      entity: 'profile',
      userId,
      updatedAt: new Date().toISOString(),
    },
  }));
}

