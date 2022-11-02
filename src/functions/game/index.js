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
  // await createGame();

  async function loop() {
    console.log('START LOOP', counter);

    while (counter < 10000) {
      counter += 1;

      console.log('LOOP', counter);

      // await new Promise((resolve) => setTimeout(resolve, 1000));

      const connections = await getConnections();
      await sendMessage(counter, connections);
    }
  }

  await loop();
};

export default game;
