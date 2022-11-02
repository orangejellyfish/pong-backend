import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_GAME } = process.env;

const createGame = async () => {
  const newGame = {
    TableName: TABLE_GAME,
    Item: {
      pk: 'GAME',
      sk: 'GAME',
      state: {
        count: 0,
      },
    },
  };

  await db.put(newGame);
};

const deleteGame = async () => {
  const game = {
    TableName: TABLE_GAME,
    Key: {
      pk: 'GAME',
      sk: 'GAME',
    },
  };

  await db.delete(game);
};

const getGame = async () => {
  log.info('getting game');
  const game = {
    TableName: TABLE_GAME,
    Key: {
      pk: 'GAME',
      sk: 'GAME',
    },
  };

  const result = await db.get(game);
  log.info(`game ${result}`);
  return result;
};

export {
  createGame,
  getGame,
  deleteGame,
};
