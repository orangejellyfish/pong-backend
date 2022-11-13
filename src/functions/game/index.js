/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';
import log from '../../utils/logging';
import { Game, deleteGame, getGame } from '../../models/game';
import { getAllEvents, deleteEvents } from '../../models/event';
import { getConnections, sendMessage } from '../../utils/sockets';

const eb = new AWS.EventBridge({
  apiVersion: '2015-10-07',
});

const gameStartedEvent = {
  Detail: JSON.stringify({}),
  DetailType: 'game_started',
  Source: 'pong/game',
};

let counter = 0;

export const game = async function game() {
  const metrics = createMetricsLogger();

  metrics.putDimensions({ Service: 'Game' });

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

    // Also send to all connected Clients
    const connections = await getConnections();
    await sendMessage({ event: 'GAME_START' }, connections);

    while (counter < 1000) {
      const loopStartTime = performance.now();

      counter += 1;

      const isGame = await getGame();

      if (!isGame) {
        return;
      }

      const allEvents = await getAllEvents();

      const getAllEventsTimeStamp = performance.now();
      const getAllEventsTime = getAllEventsTimeStamp - loopStartTime;

      try {
        await deleteEvents(allEvents.map((event) => ({ pk: event.pk, sk: event.sk })));
      } catch (err) {
        log.error(err);
        return;
      }

      const deleteAllEventsTimeStamp = performance.now();
      const deleteAllEventsTime = deleteAllEventsTimeStamp - getAllEventsTimeStamp;

      // Move paddles.
      const leftPaddleEvents = allEvents.filter((event) => event.paddle === 0);
      const rightPaddleEvents = allEvents.filter((event) => event.paddle === 1);

      const leftDirection = leftPaddleEvents.reduce((total, event) => total + event.event, 0);
      const rightDirection = rightPaddleEvents.reduce((total, event) => total + event.event, 0);

      if (leftDirection < 0) {
        game.state.paddles[0].dy = Game.PADDLE_SPEED;
      } else if (leftDirection > 0) {
        game.state.paddles[0].dy = -Game.PADDLE_SPEED;
      } else {
        game.state.paddles[0].dy = 0;
      }

      if (rightDirection < 0) {
        game.state.paddles[1].dy = Game.PADDLE_SPEED;
      } else if (rightDirection > 0) {
        game.state.paddles[1].dy = -Game.PADDLE_SPEED;
      } else {
        game.state.paddles[1].dy = 0;
      }

      const hasWinner = game.tick();

      if (hasWinner) {
        return;
      }

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
      const gameLogicEndTimeStamp = performance.now();
      const gameLogicEndTime = gameLogicEndTimeStamp - loopStartTime;

      const connections = await getConnections();

      const rightPlayers = connections.filter((connection) => connection.paddle === 1).length;
      const leftPlayers = connections.length - rightPlayers;

      await sendMessage(
        {
          state: { ...game.state, players: [leftPlayers, rightPlayers] },
        },
        connections.filter((connection) => connection.display),
      );

      const messageSendEndTime = performance.now() - gameLogicEndTimeStamp;

      log.info(`messageSendTime ${messageSendEndTime}`);

      metrics.putMetric('Process Paddle Events', getAllEventsTime, Unit.Milliseconds);
      metrics.putMetric('Remove Paddle Events', deleteAllEventsTime, Unit.Milliseconds);
      metrics.putMetric('Game Logic', gameLogicEndTime, Unit.Milliseconds);
      metrics.putMetric('Message Send', messageSendEndTime, Unit.Milliseconds);

      await metrics.flush();
    }
  }

  await loop();

  const winner = game.getWinner();

  // Broadcast that a game has ended
  try {
    await eb.putEvents({
      Entries: [{
        Detail: JSON.stringify({ winner }),
        DetailType: 'game_ended',
        Source: 'pong/game',
      }],
    }).promise();
  } catch (err) {
    log.error('Failed to publish game_ended event', err);
  }

  // Also send to all connected Clients
  const connections = await getConnections();
  await sendMessage({ event: 'GAME_END', winner }, connections);

  // Clear up the game from DB
  await deleteGame();
  counter = 0;
};

export default game;
