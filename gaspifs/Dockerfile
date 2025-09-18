FROM amazonlinux:2

RUN yum install -y gcc gcc-c++ make tar gzip curl \
    && curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && source $HOME/.cargo/env \
    && rustc --version

ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /usr/src/gaspifs
COPY . .

RUN cargo build --release
