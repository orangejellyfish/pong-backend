import { EventBridge } from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';
import { getGame } from '../../models/game';

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

  try {
    const game = await getGame();
    if (game) {
      return { statusCode: 200 };
    }
  } catch (err) {
    log.error(err);
  }

  const createGameEvent = {
    Detail: JSON.stringify({}),
    DetailType: 'create_game',
    Source: 'pong/connect',
  };

  try {
    await eb.putEvents({
      Entries: [createGameEvent],
    }).promise();
  } catch (err) {
    log.error('Failed to publish CREATE_GAME event', err);
    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

export default handleConnect;
