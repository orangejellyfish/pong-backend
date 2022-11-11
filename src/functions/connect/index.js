import { EventBridge } from 'aws-sdk';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const eb = new EventBridge({
  apiVersion: '2015-10-07',
});

// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
async function handleConnect(event) {
  const eventHandleStartTime = performance.now();

  const metrics = createMetricsLogger();
  metrics.putDimensions({ Service: 'Connect' });

  const { requestContext: { connectionId } } = event;
  const display = event?.queryStringParameters?.display;

  const params = {
    TableName: process.env.TABLE_CONNECTIONS,
    Item: {
      pk: connectionId,
      display,
    },
  };

  // Add TTL onto any connection that is not a display
  if (!display) {
    params.Item.ttl = Math.floor(Date.now() / 1000) + 60 * 60; // 60 Minutes
  }

  try {
    await db.put(params);
  } catch (err) {
    log.error('Failed to write connection', err);
    return { statusCode: 500 };
  }

  const clientConnectedEvent = {
    Detail: JSON.stringify({ connectionId }),
    DetailType: display ? 'display_connected' : 'client_connected',
    Source: 'pong/connect',
  };

  try {
    await eb.putEvents({
      Entries: [clientConnectedEvent],
    }).promise();
  } catch (err) {
    log.error('Failed to publish client_connected event', err);
    return { statusCode: 500 };
  }

  const eEventOverallTime = performance.now() - eventHandleStartTime;

  metrics.putMetric('Connect Time', eEventOverallTime, Unit.Milliseconds);

  await metrics.flush();

  return { statusCode: 200 };
}

export default handleConnect;
