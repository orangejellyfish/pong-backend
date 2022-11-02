import db, { batchDelete } from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_GAME } = process.env;

const getAllEvents = async () => {
  const allEvents = {
    TableName: TABLE_GAME,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeValues: {
      ':pk': 'EVENT',
    },
    ExpressionAttributeNames: {
      '#pk': 'pk',
    },
    ScanIndexForward: true,
  };

  let res;
  try {
    res = await db.query(allEvents);
  } catch (err) {
    throw Error(err);
  }

  return res;
};

const deleteEvents = async (eventsToDelete) => {
  let res;
  try {
    res = await batchDelete(TABLE_GAME, eventsToDelete);
  } catch (err) {
    throw Error(err);
  }

  return res;
};

export {
  getAllEvents,
  deleteEvents,
};
