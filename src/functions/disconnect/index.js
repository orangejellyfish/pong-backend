import db from '../../utils/dynamodb';
import log from '../../utils/logging';

// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
async function handleDisconnect(event) {
  const { requestContext: { connectionId } } = event;
  const params = {
    TableName: process.env.TABLE_CONNECTIONS,
    Key: {
      pk: connectionId,
    },
  };

  try {
    await db.delete(params);
  } catch (err) {
    log.error('Failed to remove connection', err);
    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

export default handleDisconnect;
