import handler from '@vendia/serverless-express';
import { app } from './index'; // adjust to your app's entry point

export const lambdaHandler = handler({app});
