import { v4 as uuid } from 'uuid';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
async function handleMessage(event) {
  const eventHandleStartTime = performance.now();
  const metrics = createMetricsLogger();
  metrics.putDimensions({ Service: 'Incoming Message Handler' });

  const { body, requestContext: { connectionId } } = event;
  const message = JSON.parse(body);

  const JSONParseTime = performance.now() - eventHandleStartTime;

  const params = {
    TableName: process.env.TABLE_GAME,
    Item: {
      pk: 'EVENT',
      sk: uuid(),
      event: message.event,
      paddle: message.paddle,
      connectionId,
    },
  };

  try {
    await db.put(params);
  } catch (err) {
    log.error('Failed to write event', err);
    return { statusCode: 500 };
  }

  const DBHandleOverallTime = performance.now() - eventHandleStartTime;

  metrics.putMetric('JSON Parse Latency', JSONParseTime, Unit.Milliseconds);
  metrics.putMetric('DB Write Latency', DBHandleOverallTime, Unit.Milliseconds);
  await metrics.flush();

  return { statusCode: 200 };
}

export default handleMessage;
