/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
// Lambda handler. We are using an async function to simplify the code and
// remove the need to use a callback.
import db from '../../utils/dynamodb';
import log from '../../utils/logging';
import { sendMessage } from '../../utils/sockets';

const { TABLE_CONNECTIONS } = process.env;

async function setPaddleinDatabase(connectionId) {
  let paddle;

  try {
    const connectionItems = await db.scan({
      TableName: TABLE_CONNECTIONS,
    });

    const currentConnectionItem = connectionItems.find((item) => item.pk === connectionId);

    const clientConnectionItems = connectionItems.filter((item) => !item.display);

    const paddlesOnRight = clientConnectionItems.filter((item) => item.paddle === 1);

    if (paddlesOnRight.length > Math.floor((clientConnectionItems.length - 1) / 2)) {
      log.info('assigned left paddle');
      paddle = 0;
    } else {
      log.info('assigned right paddle');
      paddle = 1;
    }

    const newConnectionItem = { ...currentConnectionItem, paddle };

    const update = db.generateUpdateExpression(currentConnectionItem, newConnectionItem);

    await db.update({
      TableName: TABLE_CONNECTIONS,
      Key: {
        pk: currentConnectionItem.pk,
      },
      ...update,
    });

    return newConnectionItem;
  } catch (err) {
    log.error('Failed to update connection with paddle', err);
    throw err;
  }
}

const assignPaddle = async function assignPaddle(event) {
  const { connectionId } = event.detail;

  const newConnectionItem = await setPaddleinDatabase(connectionId);

  await sendMessage({ paddle: newConnectionItem.paddle }, newConnectionItem);
};

export default assignPaddle;
