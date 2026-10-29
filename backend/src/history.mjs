import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const tableName = process.env.TABLE_NAME;
const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const key = (userId, id) => ({ PK: `USER#${userId}`, SK: `HISTORY#${id}` });

function authenticatedIdentity(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const sub = claims.sub;
  return sub ? String(sub) : null;
}

function paidIdentity(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  return claims['custom:tier'] === 'paid' ? authenticatedIdentity(event) : null;
}

function body(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}

function validEntry(value) {
  return value && typeof value.readingId === 'string' && value.readingId.length <= 100
    && typeof value.question === 'string' && value.question.length <= 500
    && typeof value.result === 'string' && value.result.length > 0 && value.result.length <= 200000
    && Array.isArray(value.cards) && value.cards.length <= 3;
}

function validProfile(value) {
  return value && typeof value.nickname === 'string' && value.nickname.length <= 100
    && typeof value.date === 'string' && value.date.length <= 20
    && typeof value.time === 'string' && value.time.length <= 20
    && typeof value.timeUnknown === 'boolean'
    && typeof value.place === 'string' && value.place.length <= 200
    && (value.latitude === undefined || (typeof value.latitude === 'number' && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90))
    && (value.longitude === undefined || (typeof value.longitude === 'number' && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180))
    && (value.timezone === undefined || (typeof value.timezone === 'string' && value.timezone.length <= 100));
}

function profileKey(userId) { return { PK: `USER#${userId}`, SK: 'PROFILE' }; }

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const id = event.pathParameters?.id;
  const path = event.rawPath || event.requestContext?.http?.path || event.routeKey || '';
  const isProfile = path.endsWith('/profile');

  if (isProfile) {
    const userId = authenticatedIdentity(event);
    if (!userId) return json(401, { error: 'Authentication required' });
    if (method === 'GET') {
      const result = await client.send(new GetCommand({ TableName: tableName, Key: profileKey(userId) }));
      if (!result.Item) return json(200, { profile: null });
      const { PK: _pk, SK: _sk, entity: _entity, userId: _userId, updatedAt: _updatedAt, ...profile } = result.Item;
      return json(200, { profile });
    }
    if (method === 'PUT') {
      const value = body(event);
      if (!validProfile(value)) return json(400, { error: 'Invalid profile' });
      await client.send(new PutCommand({ TableName: tableName, Item: { ...value, ...profileKey(userId), entity: 'profile', userId, updatedAt: new Date().toISOString() } }));
      return json(200, { profile: value });
    }
    return json(405, { error: 'Method not allowed' });
  }

  const userId = paidIdentity(event);
  if (!userId) return json(403, { error: 'Paid plan required' });

  if (method === 'GET' && id) {
    const result = await client.send(new GetCommand({ TableName: tableName, Key: key(userId, id) }));
    return result.Item ? json(200, result.Item) : json(404, { error: 'History entry not found' });
  }
  if (method === 'DELETE' && id) {
    await client.send(new DeleteCommand({ TableName: tableName, Key: key(userId, id) }));
    return { statusCode: 204, body: '' };
  }
  if (method === 'GET') {
    const result = await client.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'HISTORY#' },
      ScanIndexForward: false,
      Limit: 50,
    }));
    return json(200, result.Items || []);
  }
  if (method === 'POST') {
    const value = body(event);
    if (!validEntry(value)) return json(400, { error: 'Invalid history entry' });
    const entry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      readingId: value.readingId,
      topic: typeof value.topic === 'string' ? value.topic : undefined,
      question: value.question,
      cards: value.cards,
      result: value.result,
    };
    await client.send(new PutCommand({ TableName: tableName, Item: { ...entry, ...key(userId, entry.id), entity: 'history', userId } }));
    return json(201, entry);
  }
  return json(405, { error: 'Method not allowed' });
}

