#!bin/bash
set -exuo pipefail
trap 'shutdown -h now' EXIT

REGION="__REGION__"
TABLE="__TABLE__"
DBSNP_ID="__DBSNP_ID__"
DBSNP_HASH="__DBSNP_HASH__"
REFERENCE_LOCATION="__REFERENCE_LOCATION__"

dnf install -y \
    bzip2 \
    gzip \
    tar \
    wget \
    gcc \
    make \
    zlib-devel \
    bzip2-devel \
    xz-devel \
    curl-devel \

wget "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -O awscliv2.zip \
    && unzip awscliv2.zip \
    && sudo ./aws/install \
    && export PATH=/usr/local/bin:$PATH

wget "https://github.com/samtools/htslib/releases/download/1.21/htslib-1.21.tar.bz2" \
    && tar -xvjf htslib-1.21.tar.bz2 \
    && cd htslib-1.21 \
    && ./configure \
    && make \
    && make install \
    && cd ..

wget -q "https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz" -O dbsnp.vcf.gz
aws s3 cp dbsnp.vcf.gz "s3://${REFERENCE_LOCATION}/dbsnp.vcf.gz" --region "${REGION}"

wget -q "https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz.tbi" -O dbsnp.vcf.gz.tbi
aws s3 cp dbsnp.vcf.gz.tbi "s3://${REFERENCE_LOCATION}/dbsnp.vcf.gz.tbi" --region "${REGION}"

aws dynamodb update-item \
    --region "${REGION}" \
    --table-name "${TABLE}" \
    --key '{"id": {"S": "'"${DBSNP_ID}"'"}}' \
    --update-expression "SET version = :version" \
    --expression-attribute-values '{":version": {"S": "'"${DBSNP_HASH}"'"}}'
