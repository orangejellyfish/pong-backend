/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';
import { Game, deleteGame } from '../../models/game';
import { getAllEvents, deleteEvents } from '../../models/event';

const { TABLE_CONNECTIONS } = process.env;

const api = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIGATEWAY_ENDPOINT,
});

const eb = new AWS.EventBridge({
  apiVersion: '2015-10-07',
});

const gameStartedEvent = {
  Detail: JSON.stringify({}),
  DetailType: 'game_started',
  Source: 'pong/game',
};

const gameEndedEvent = {
  Detail: JSON.stringify({}),
  DetailType: 'game_ended',
  Source: 'pong/game',
};

let counter = 0;

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

export const game = async function game() {
  // Create a new game instance and store the fact that a game has begun in the
  // database. Only one instance can be running at a time.
  const game = await Game.create();

  if (!game) {
    return;
  }

  async function loop() {
    // Broadcast that a game has started
    try {
      await eb.putEvents({
        Entries: [gameStartedEvent],
      }).promise();
    } catch (err) {
      log.error('Failed to publish game_started event', err);
    }

    while (counter < 100) {
      const loopStartTime = performance.now();

      counter += 1;

      const allEvents = await getAllEvents();

      try {
        await deleteEvents(allEvents.map((event) => ({ pk: event.pk, sk: event.sk })));
      } catch (err) {
        log.error(err);
        return;
      }

      // Move paddles.
      const leftPaddleEvents = allEvents.filter((event) => event.paddle === 0);
      const rightPaddleEvents = allEvents.filter((event) => event.paddle === 1);

      const leftDirection = leftPaddleEvents.reduce((total, event) => total + event.event, 0);
      const rightDirection = rightPaddleEvents.reduce((total, event) => total + event.event, 0);

      if (leftDirection < 0) {
        game.state.paddles[0].dy = Game.PADDLE_SPEED;
      } else if (leftDirection > 0) {
        game.state.paddles[0].dy = -Game.PADDLE_SPEED;
      }

      if (rightDirection < 0) {
        game.state.paddles[1].dy = Game.PADDLE_SPEED;
      } else if (rightDirection > 0) {
        game.state.paddles[1].dy = -Game.PADDLE_SPEED;
      }

      game.tick();

      // const gameStateEvent = {
      //   Detail: JSON.stringify({ state: game.state }),
      //   DetailType: 'game_state',
      //   Source: 'pong/game',
      // };

      // try {
      //   await eb.putEvents({
      //     Entries: [gameStateEvent],
      //   }).promise();
      // } catch (err) {
      //   log.error('Failed to publish game_ended event', err);
      // }

      const connections = await getConnections();
      await sendMessage({ state: game.state, paddle: 1 }, connections);
      // await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  await loop();

  // Broadcast that a game has ended
  try {
    await eb.putEvents({
      Entries: [gameEndedEvent],
    }).promise();
  } catch (err) {
    log.error('Failed to publish game_ended event', err);
  }

  await deleteGame();
  counter = 0;
};

export default game;
