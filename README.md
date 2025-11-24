# BGSI-GeneticAnalysisSupportPlatformIndonesia-GASPI

## AMI Details for AWS based deployment

```
al2023-ami-2023.6.20241212.0-kernel-6.1-x86_64
```

## Setting up environment 

### In EC2 (Amazon Linux 2023)

Install necessary tools, for this you can run `env.sh` script. Please note that you must restart your EC2 instance for some changes (user group related) to take effect.

The script will install all necessary dependencies.

### In Docker (EC2 or Devcontainers usage)

Note that this approach requires docker in docker, which might not work correctly if you have permission mismatches.

```bash
RUN dnf update -y
RUN dnf install -y git docker
```

Start docker deamon and build the container

```bash
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo docker build --build-arg PLATFORM=linux/amd64 -t gaspi .devcontainer
```

Start the container

```bash
sudo docker run --init --rm --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v `pwd`:`pwd` \
  -w `pwd` \
  --platform linux/x86_64 \
  -it gaspi:latest \
  /bin/bash
```

## Clone Source Code

```bash
git clone https://github.com/GSI-Xapiens-CSIRO/BGSI-GeneticAnalysisSupportPlatformIndonesia-GASPI.git
git submodule init
git submodule update
```

## Initialisation

Please run `init.sh` scripts in `svep` and `sbeacon` directories. Then run `pnpm install` from `webgui/webapp` directory.

## Deployment

```bash
terraform apply
```
