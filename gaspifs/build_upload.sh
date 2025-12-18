#!/bin/bash
set -e
cd ${1}
echo "{ \"CLI_API\": \"${3}\", \"AWS_REGION\": \"${4}\", \"COGNITO_CLIENT_ID\": \"${5}\" }" > ./gaspifs.json

docker build --platform=linux/amd64 -t gaspifs-builder .

docker create --platform=linux/amd64  --name extract gaspifs-builder

docker cp extract:/usr/src/gaspifs/target/release/gaspifs ./gaspifs

docker rm extract

aws s3 cp ./gaspifs "${2}"
