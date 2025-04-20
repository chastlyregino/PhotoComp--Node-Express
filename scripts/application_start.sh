#!/bin/bash
cd /home/ubuntu/PhotoComp--Node-Express

export TABLE_NAME=PhotoCompTable
export JWT_SECRET=your_jwt_secret_here
export EXPIRES_IN=1h
export REGION=us-east-1
export S3_BUCKET_NAME=photo-comp-s3-bucket
export MAIL_HOST=gmail
export MAIL_USERNAME=chasregino@gmail.com
export MAIL_PASSWORD=gibprzfucmvjafef
export PORT=3000

node dist/src/index.js