// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import AWS from 'aws-sdk';
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_GAME, TABLE_CONNECTIONS } = process.env;

const api = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIGATEWAY_ENDPOINT,
});

let counter = 0;

const createGame = async () => {
  const newGame = {
    TableName: TABLE_GAME,
    Item: {
      pk: 'GAME',
      sk: 'STATE',
      state: {
        count: 0,
      },
    },
  };

  await db.put(newGame);
};

export const game = async function game(event) {
  log.info(event);
  // await createGame();

  setInterval(async () => {
    // eslint-disable-next-line no-plusplus
    counter++;

    const connections = await db.scan({
      TableName: TABLE_CONNECTIONS,
    });

    try {
      await Promise.all(
        connections.map((connection) => api.postToConnection({
          ConnectionId: connection.pk,
          Data: JSON.stringify({
            counter,
          }),
        }).promise()),
      );
    } catch (err) {
      log.error('Failed to send message to connection', err);
      log.error(err);
    }
  }, 500);
};

export default game;
