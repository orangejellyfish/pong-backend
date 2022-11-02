import AWS from 'aws-sdk';
import log from '../logging';
import db from '../dynamodb';

const { TABLE_CONNECTIONS } = process.env;

const api = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIGATEWAY_ENDPOINT,
});

const getConnections = async () => {
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
};

const sendMessage = async (message, connections) => {
  if (!Array.isArray(connections)) {
    // eslint-disable-next-line no-param-reassign
    connections = [connections];
  }

  try {
    const Data = JSON.stringify(message);
    await Promise.allSettled(
      connections.map((connection) => api.postToConnection({
        ConnectionId: connection.pk,
        Data,
      }).promise()),
    );
  } catch (err) {
    log.error('Failed to send message to connection', err);
  }
};

export {
  getConnections,
  sendMessage,
};
