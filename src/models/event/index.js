import db from '../../utils/dynamodb';
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

const deleteAllEvents = async (eventsToDelete) => {
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
    res = await db.batchDelete(allEvents);
  } catch (err) {
    throw Error(err);
  }

  return res;
};

export {
  getAllEvents,
  deleteAllEvents,
};
