import serverlessExpress from '@codegenie/serverless-express';
import { app } from './index'; // adjust to your app's entry point

export const lambdaHandler = serverlessExpress({app});
