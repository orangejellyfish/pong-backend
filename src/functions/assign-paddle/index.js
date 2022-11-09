/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_CONNECTIONS } = process.env;

const api = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIGATEWAY_ENDPOINT,
});

async function setPaddleinDatabase(connectionId) {
  try {
    const connectionItems = await db.scan({
      TableName: TABLE_CONNECTIONS,
    });

    const connectionItemsCount = connectionItems.length;

    const paddle = connectionItemsCount % 2;

    await db.put({
      TableName: TABLE_CONNECTIONS,
      Item: {
        pk: connectionId,
        paddle,
      },
    });

    return paddle;
  } catch (err) {
    log.error('Failed to update connection with paddle', err);
    throw err;
  }
}

async function sendMessage(message, connectionId) {
  try {
    await api.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }).promise();
  } catch (err) {
    log.error('Failed to send message to connection', err);
  }
}

const assignPaddle = async function assignPaddle(event) {
  log.info(event);

  const { connectionId } = event.detail;

  const paddle = await setPaddleinDatabase(connectionId);

  await sendMessage({ paddle }, connectionId);
};

export default assignPaddle;
