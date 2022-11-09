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

async function getConnections() {
  let connections;

  try {
    connections = await db.scan({
      TableName: TABLE_CONNECTIONS,
    });
  } catch (err) {
    log.error('Failed to get connections', err);
    throw err;
  }

  return connections;
}

async function sendMessage(message, connections) {
  try {
    await Promise.all(
      connections.map((connection) => api.postToConnection({
        ConnectionId: connection.pk,
        Data: JSON.stringify(message),
      }).promise()),
    );
  } catch (err) {
    log.error('Failed to send message to connection', err);
  }
}

export const broadcast = async function game(event) {
  // Create a new game instance and store the fact that a game has begun in the
  // database. Only one instance can be running at a time.
  const connections = await getConnections();
  await sendMessage({ state: event.detail.state, paddle: 1 }, connections);
};

export default broadcast;
