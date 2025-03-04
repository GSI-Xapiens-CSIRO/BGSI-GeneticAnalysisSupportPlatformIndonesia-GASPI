FROM public.ecr.aws/lambda/python:3.12-x86_64

RUN dnf install -y \
    git \
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

RUN wget https://github.com/samtools/htslib/releases/download/1.18/htslib-1.18.tar.bz2 \
    && tar -xvjf htslib-1.18.tar.bz2 \
    && cd htslib-1.18 \
    && ./configure \
    && make \
    && make install

RUN mkdir -p /opt/bin
RUN mkdir -p /opt/lib

RUN cp $(command -v bcftools) /opt/bin
RUN ldd $(command -v bcftools) | awk 'NF == 4 { system("cp " $3 " /opt/lib") }'

ENV PATH="/opt/bin:$PATH"
ENV LD_LIBRARY_PATH="/opt/lib:$LD_LIBRARY_PATH"

WORKDIR /opt

RUN wget https://github.com/PharmGKB/PharmCAT/releases/download/v2.15.5/pharmcat-preprocessor-2.15.5.tar.gz

RUN tar -xvf pharmcat-preprocessor-2.15.5.tar.gz && \
    rm pharmcat-preprocessor-2.15.5.tar.gz
    
WORKDIR /opt/preprocessor    

RUN pip install -r requirements.txt

RUN python -c "import preprocessor; preprocessor.prep_pharmcat_positions()"

WORKDIR ${LAMBDA_TASK_ROOT}

COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

CMD ["lambda_function.lambda_handler"]