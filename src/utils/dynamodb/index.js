import AWS from 'aws-sdk';
import { createDynamoDBClient } from '@orangejellyfish/serverless-toolkit';

const documentClient = new AWS.DynamoDB.DocumentClient();

export default createDynamoDBClient(documentClient);

export async function batchDelete(table, items) {
  const MAX_ITEMS_PER_BATCH = 25;
  const numBatches = Math.ceil(items.length / MAX_ITEMS_PER_BATCH);

  const batches = [...Array(numBatches)].map((_, i) => {
    const start = i * MAX_ITEMS_PER_BATCH;
    const end = start + MAX_ITEMS_PER_BATCH;
    const batchItems = items
      .slice(start, end)
      .map((Key) => ({ DeleteRequest: { Key } }));
    return { [table]: batchItems };
  });

  while (batches.length) {
    const params = { RequestItems: batches.pop() };
    const res = await documentClient.batchWrite(params).promise();

    if (Object.keys(res.UnprocessedItems).length) {
      batches.push(res.UnprocessedItems);
    }
  }
}
