FROM public.ecr.aws/lambda/nodejs:18

WORKDIR /src/pcsam

# Copy function code
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install -g typescript
RUN npm install

COPY . .

RUN tsc -p tsconfig.prod.json && ls -l dist

# Set the Lambda handler
CMD [ "dist/lambda.lambdaHandler" ]
