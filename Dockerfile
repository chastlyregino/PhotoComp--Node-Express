FROM public.ecr.aws/lambda/nodejs:18

WORKDIR /var/task

COPY . .
# Copy function code
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install -g typescript
RUN npm install

RUN tsc -p tsconfig.prod.json && ls -l dist

RUN cp dist/lambda.js . && cp -r dist/* .

# Set the Lambda handler
CMD [ "lambda.lambdaHandler" ]
