import AWS from 'aws-sdk';
import { createDynamoDBClient } from '@orangejellyfish/serverless-toolkit';

const documentClient = new AWS.DynamoDB.DocumentClient();

export default createDynamoDBClient(documentClient);
