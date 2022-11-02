// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_GAME } = process.env;

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
  await createGame();
};

export default game;
