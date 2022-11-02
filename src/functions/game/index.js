// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';
import { createGame, deleteGame } from '../../models/game';

const { TABLE_CONNECTIONS } = process.env;

const api = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIGATEWAY_ENDPOINT,
});

let counter = 0;

async function getConnections() {
  log.info('GET CONNECTIONS');
  let connections;

  try {
    connections = await db.scan({
      TableName: TABLE_CONNECTIONS,
    });
  } catch (err) {
    log.error('Failed to get connections', err);
    throw err;
  }

  log.info('GOT CONNECTIONS', connections);

  return connections;
}

async function sendMessage(message, connections) {
  log.info('SEND MESSAGE', connections);
  try {
    await Promise.all(
      connections.map((connection) => api.postToConnection({
        ConnectionId: connection.pk,
        Data: JSON.stringify({
          message,
        }),
      }).promise()),
    );
  } catch (err) {
    log.error('Failed to send message to connection', err);
  }
}

export const game = async function game(event) {
  log.info(event);
  await createGame();
  counter = 0;

  async function loop() {
    console.log('START LOOP', counter);

    while (counter < 10) {
      counter += 1;

      const message = {
        paddles: [Math.floor(Math.random() * 510), Math.floor(Math.random() * 510)],
      };

      const connections = await getConnections();
      await sendMessage(message, connections);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await loop();

  await deleteGame();
};

export default game;
