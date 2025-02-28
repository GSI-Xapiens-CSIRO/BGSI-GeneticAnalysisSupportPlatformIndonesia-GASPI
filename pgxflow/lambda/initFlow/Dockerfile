FROM public.ecr.aws/lambda/python:3.12-x86_64

RUN dnf install -y \
    bzip2 \
    gzip \
    tar \
    wget \
    gcc \
    make \
    zlib-devel \
    bzip2-devel \
    xz-devel \
    curl-devel 

WORKDIR /src

RUN wget https://github.com/samtools/bcftools/releases/download/1.18/bcftools-1.18.tar.bz2 \
    && tar -xvjf bcftools-1.18.tar.bz2 \
    && cd bcftools-1.18 \
    && ./configure \
    && make \
    && make install

RUN mkdir -p /opt/bin
RUN mkdir -p /opt/lib

RUN cp $(command -v bcftools) /opt/bin
RUN ldd $(command -v bcftools) | awk 'NF == 4 { system("cp " $3 " /opt/lib") }'

WORKDIR ${LAMBDA_TASK_ROOT}/

COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

ADD shared ${LAMBDA_TASK_ROOT}/shared

CMD ["lambda_function.lambda_handler"]