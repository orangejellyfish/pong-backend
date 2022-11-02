/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';
import { createGame, deleteGame } from '../../models/game';
import { getAllEvents, deleteEvents } from '../../models/event';

const { TABLE_CONNECTIONS } = process.env;
const MOVE_AMOUNT = 50;

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
  let leftPaddleY = 0;
  let rightPaddleY = 0;

  async function loop() {
    console.log('START LOOP', counter);

    while (counter < 180) {
      counter += 1;

      const allEvents = await getAllEvents();

      log.info(allEvents);

      try {
        await deleteEvents(allEvents.map((event) => ({ pk: event.pk, sk: event.sk })));
      } catch (err) {
        log.error(err);
        return;
      }

      const leftPaddleEvents = allEvents.filter((event) => event.paddle === 0);
      const rightPaddleEvents = allEvents.filter((event) => event.paddle === 1);

      const leftDirection = leftPaddleEvents.reduce((total, event) => total + event.event, 0);
      const rightDirection = rightPaddleEvents.reduce((total, event) => total + event.event, 0);

      if (leftDirection < 0) {
        leftPaddleY += MOVE_AMOUNT;
      } else if (leftDirection > 0) {
        leftPaddleY -= MOVE_AMOUNT;
      }

      if (rightDirection < 0) {
        rightPaddleY += MOVE_AMOUNT;
      } else if (rightDirection > 0) {
        rightPaddleY -= MOVE_AMOUNT;
      }

      const message = {
        paddles: [leftPaddleY, rightPaddleY],
      };

      const connections = await getConnections();
      await sendMessage(message, connections);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  await loop();

  await deleteGame();
  counter = 0;
};

export default game;
