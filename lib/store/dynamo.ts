import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

const partition = (userId: string) => `USER#${userId}`;
const sortKey = (id: string) => `HISTORY#${id}`;
const profileKey = (userId: string) => ({ PK: partition(userId), SK: 'PROFILE' });

export function isDynamoHistoryEnabled(): boolean {
  return process.env.DATA_STORE === 'dynamodb' && !!process.env.DYNAMODB_TABLE_NAME;
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

