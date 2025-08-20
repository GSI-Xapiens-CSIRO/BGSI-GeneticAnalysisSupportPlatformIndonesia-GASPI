from public.ecr.aws/lambda/python:3.12-x86_64

RUN dnf update -y && dnf install -y \
    wget \
    java-17-amazon-corretto-headless

WORKDIR /opt

# Copy logging configuration for pharmcat jar so that logs are written to console
COPY logback.xml /opt/logback.xml

WORKDIR ${LAMBDA_TASK_ROOT}/

RUN wget https://github.com/PharmGKB/PharmCAT/releases/download/v2.15.5/pharmcat-2.15.5-all.jar -O pharmcat.jar

COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

ADD shared ${LAMBDA_TASK_ROOT}/shared

COPY ./.hash.txt ${LAMBDA_TASK_ROOT}/

CMD ["lambda_function.lambda_handler"]
