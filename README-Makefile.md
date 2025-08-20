# BGSI-GASPI Deployment Guide

## Overview

This repository contains a Makefile to automate the deployment of the BGSI-GeneticAnalysisSupportPlatformIndonesia-GASPI (BGSI-GASPI) project. The Makefile streamlines the process of cloning the repository, initializing sBeacon, and deploying to different AWS environments (Hub01 and Hub02).

## Prerequisites

Before using this Makefile, ensure you have the following prerequisites:

### System Requirements:
- Git
- Python 3.12
- AWS CLI v2
- Terraform v1.9.4 or newer
- Valid AWS credentials for both Hub01 and Hub02 environments
- SSH access configured for GitHub
- Sudo privileges (for Docker installation)

The Makefile includes automated installation for:
- Node.js v20 (via nvm)
- pnpm package manager
- Docker and Docker Compose

## Environment Setup

1. **Python Virtual Environment**:
   ```bash
   python3.12 -m venv ~/py312
   source ~/py312/bin/activate
   ```

2. **AWS Credentials**:
   Ensure your AWS credentials are properly configured in `~/.aws/credentials` with the following profiles:
   ```ini
   [GXC-TF-User-Executor-Hub01]
   aws_access_key_id = your_access_key
   aws_secret_access_key = your_secret_key
   region = ap-southeast-3

   [GXC-TF-User-Executor-Hub02]
   aws_access_key_id = your_access_key
   aws_secret_access_key = your_secret_key
   region = ap-southeast-3
   ```

## Usage

### Basic Commands

1. **Full Deployment to Hub01** (Default):
   ```bash
   make
   ```
   This command will:
   - Install all dependencies (Node.js, pnpm, Docker)
   - Clone the repository
   - Initialize submodules
   - Initialize sBeacon
   - Deploy to Hub01

2. **Install Dependencies Only**:
   ```bash
   make install-deps
   ```
   This will install:
   - NVM (Node Version Manager)
   - Node.js v20
   - pnpm package manager
   - Docker and Docker Compose

3. **Individual Dependency Installation**:
   ```bash
   make install-nvm     # Install NVM
   make install-node    # Install Node.js v20
   make install-pnpm    # Install pnpm
   make install-docker  # Install Docker and Docker Compose
   ```

4. **Check Tool Versions**:
   ```bash
   make version-check
   ```
   This will display versions of:
   - Node.js
   - pnpm
   - Docker
   - Docker Compose
   - Terraform
   - Python
   - AWS CLI

### Deployment Steps

1. **Clone Repository**:
   ```bash
   make clone
   ```

2. **Init Submodule `sbeacon` & `svep`**:
   ```bash
   make init-submodule
   ```

3. **Initialize sBeacon**:
   ```bash
   make init-sbeacon
   ```

4. **Plan Terraform Changes**:
   ```bash
   make plan
   ```

5. **Apply Terraform Changes**:
   ```bash
   make apply-terraform            # With confirmation prompt
   # or
   make apply-terraform-autoapprove  # Without confirmation
   ```

6. **View Terraform Output**:
   ```bash
   make output
   ```

7. **Clean Up**:
   ```bash
   make clean
   ```

### Environment-Specific Commands

- **Set Hub01 Environment**:
  ```bash
  make set-hub01-env
  ```

- **Set Hub02 Environment**:
  ```bash
  make set-hub02-env
  ```

- **Deploy Hub01**:
  ```bash
  make deploy-hub01
  ```

- **Deploy Hub02**:
  ```bash
  make deploy-hub02
  ```

## Directory Structure

After cloning, your repository structure should look like this:

```
BGSI-GeneticAnalysisSupportPlatformIndonesia-GASPI/
├── sbeacon/
│   └── init.sh
├── svep/
├── backend.tf
├── terraform.tfvars
└── Makefile
```

## Configuration Files

### Hub01 Configuration

1. **backend.tf**:
   ```hcl
   terraform {
     backend "s3" {
       bucket         = "terraform-states-hub1-gaspi"
       key            = "gaspi-infrastructure-deployment"
       region         = "ap-southeast-3"
       dynamodb_table = "terraform-states-hub1-gaspi"
     }
   }
   ```

### Hub02 Configuration

1. **backend.tf**:
   ```hcl
   terraform {
     backend "s3" {
       region         = "ap-southeast-3"
       bucket         = "tf-state-209479276142-ap-southeast-3"
       dynamodb_table = "ddb-tf-state-209479276142-ap-southeast-3"
       key            = "gxc-consortium/209479276142/sbeacon/terraform.tfstate"
       encrypt        = true
     }
   }
   ```

## Troubleshooting

1. **AWS Authentication Issues**:
   - Ensure AWS credentials are properly configured
   - Verify the correct AWS profile is being used
   - Check AWS CLI configuration using `aws configure list`
   - Check AWS CLI access token `aws sts get-caller-identity --profile $AWS_PROFILE`

2. **Python Environment Issues**:
   - Verify Python 3.12 is installed: `python3.12 --version`
   - Ensure virtual environment is activated
   - Check required Python packages are installed

3. **Terraform State Issues**:
   - Verify S3 bucket exists and is accessible
   - Check DynamoDB table permissions
   - Ensure backend configuration is correct

4. **Docker Installation Issues**:
   - Ensure user is in docker group
   - Verify docker service is running: `sudo systemctl status docker`
   - Check docker compose installation: `docker compose version`

5. **Node.js/pnpm Issues**:
   - Verify NVM installation: `nvm --version`
   - Check Node.js version: `node --version`
   - Verify pnpm installation: `pnpm --version`

## Support

For issues or questions related to this deployment process, please contact:
- DevOps Team: devops@xapiens.id