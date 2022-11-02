const { TABLE_GAME } = process.env;

const getAll = async () => {
  const allTutors = {
    TableName: TABLE_GAME,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeValues: {
      ':pk': 'STAFF',
    },
    ExpressionAttributeNames: {
      '#pk': 'pk',
    },
    ScanIndexForward: true,
  };

  let res;
  try {
    res = await db.query(allTutors);
  } catch (err) {
    throw Error(err);
  }
};

export {
  getAll,
};
