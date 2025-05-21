#!bin/bash
set -exuo pipefail
trap 'shutdown -h now' EXIT

REGION="__REGION__"
TABLE="__TABLE__"
PHARMCAT_ID="__PHARMCAT_ID__"
PHARMCAT_VERSION="__PHARMCAT_VERSION__"
PHARMCAT_VERSION_NO="__PHARMCAT_VERSION_NO__"
PHARMGKB_ID="__PHARMGKB_ID__"
REFERENCE_LOCATION="__REFERENCE_LOCATION__"
 
dnf install -y \
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
    curl-devel \
    java-17-amazon-corretto \
    python3 \
    python3-pip

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
export PATH=/usr/local/bin:$PATH

wget "https://github.com/samtools/bcftools/releases/download/1.21/bcftools-1.21.tar.bz2" \
    && tar -xvjf bcftools-1.21.tar.bz2 \
    && cd bcftools-1.21 \
    && ./configure \
    && make \
    && make install \
    && cd ..
    
wget "https://github.com/samtools/htslib/releases/download/1.21/htslib-1.21.tar.bz2" \
    && tar -xvjf htslib-1.21.tar.bz2 \
    && cd htslib-1.21 \
    && ./configure \
    && make \
    && make install \
    && cd ..

wget "https://github.com/PharmGKB/PharmCAT/releases/download/$PHARMCAT_VERSION/pharmcat-preprocessor-$PHARMCAT_VERSION_NO.tar.gz"
mkdir -p preprocessor
tar -xvf pharmcat-preprocessor-$PHARMCAT_VERSION_NO.tar.gz && rm pharmcat-preprocessor-$PHARMCAT_VERSION_NO.tar.gz
cd preprocessor 

pip install -r requirements.txt

# download reference files using pharmcat
CURRENT_DIR=$(pwd)
CURDIR="$CURRENT_DIR" python3 -c 'import os, pcat; pcat.download_pharmcat_accessory_files(os.environ["CURDIR"]); pcat.prep_pharmcat_positions()'

cd ..

wget "https://github.com/PharmGKB/PharmCAT/releases/download/$PHARMCAT_VERSION/pharmcat-$PHARMCAT_VERSION_NO-all.jar"
wget "https://pharmcat.org/examples/pharmcat.example.vcf"
java -jar pharmcat-$PHARMCAT_VERSION_NO-all.jar -vcf pharmcat.example.vcf -reporterJson

PHARMGKB_VERSION=$(jq -r '.dataVersion' pharmcat.example.report.json)

cd preprocessor

aws s3 cp --recursive ./ s3://$REFERENCE_LOCATION/pharmcat-preprocessor/ \
    --exclude "*" \
    --include "*.vcf.bgz" \
    --include "*.fna.bgz" \
    --include "*.vcf.bgz.csi" \
    --include "*.fna.bgz.fai" \
    --include "*.fna.bgz.csi" \
    --include "*.bed"

aws dynamodb update-item \
    --region "${REGION}" \
    --table-name "${TABLE}" \
    --key '{"id": {"S": "'"${PHARMGKB_ID}"'"}}' \
    --update-expression "SET version = :version" \
    --expression-attribute-values '{":version": {"S": "'"${PHARMGKB_VERSION}"'"}}'

aws dynamodb update-item \
    --region "${REGION}" \
    --table-name "${TABLE}" \
    --key '{"id": {"S": "'"${PHARMCAT_ID}"'"}}' \
    --update-expression "SET version = :version" \
    --expression-attribute-values '{":version": {"S": "'"${PHARMCAT_VERSION}"'"}}'
