import { EventBridge } from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const eb = new EventBridge({
  apiVersion: '2015-10-07',
});

// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
async function handleConnect(event) {
  const { requestContext: { connectionId } } = event;
  const params = {
    TableName: process.env.TABLE_CONNECTIONS,
    Item: {
      pk: connectionId,
    },
  };

  try {
    await db.put(params);
  } catch (err) {
    log.error('Failed to write connection', err);
    return { statusCode: 500 };
  }

  const clientConnectedEvent = {
    Detail: JSON.stringify({ connectionId }),
    DetailType: 'client_connected',
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

  return { statusCode: 200 };
}

export default handleConnect;
