# Makefile for BGSI-GASPI Deployment
# ================================================

# Variables
REPO_NAME = BGSI-GeneticAnalysisSupportPlatformIndonesia-GASPI
REPO_URL = git@github.com:GSI-Xapiens-CSIRO/$(REPO_NAME).git
PYTHON_ENV = ~/py312/bin/activate
AWS_REGION = ap-southeast-3
NODE_VERSION = 20
SHELL := /bin/bash

# Default target
.PHONY: all
all: install-deps clone init-sbeacon deploy-hub01

# Install all dependencies
.PHONY: install-deps
install-deps: install-nvm install-node install-pnpm install-docker

# Install NVM
.PHONY: install-nvm
install-nvm:
	@echo "Installing NVM..."
	@if [ ! -d "$$HOME/.nvm" ]; then \
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash; \
		source ~/.bashrc; \
	else \
		echo "NVM is already installed"; \
	fi

# Install Node.js using NVM
.PHONY: install-node
install-node:
	@echo "Installing Node.js $(NODE_VERSION)..."
	@. ~/.nvm/nvm.sh && nvm install $(NODE_VERSION) && nvm use $(NODE_VERSION)
	@node --version

# Install pnpm
.PHONY: install-pnpm
install-pnpm:
	@echo "Installing pnpm..."
	@if ! command -v pnpm &> /dev/null; then \
		curl -fsSL https://get.pnpm.io/install.sh | sh -; \
		source ~/.bashrc; \
	else \
		echo "pnpm is already installed"; \
	fi

# Install Docker and Docker Compose
.PHONY: install-docker
install-docker:
	@echo "Installing Docker and Docker Compose..."
	@if ! command -v docker &> /dev/null; then \
		echo "Installing Docker..."; \
		sudo dnf update -y; \
		sudo dnf install -y docker docker-compose-plugin; \
		sudo systemctl start docker; \
		sudo systemctl enable docker; \
		sudo usermod -aG docker $$USER; \
		echo "Please log out and log back in to apply Docker group changes."; \
	else \
		echo "Docker is already installed"; \
	fi
	@if ! command -v docker compose &> /dev/null; then \
		echo "Installing Docker Compose..."; \
		sudo dnf install -y docker-compose-plugin; \
	else \
		echo "Docker Compose is already installed"; \
	fi

# Clone repository
.PHONY: clone
clone:
	@echo "Cloning repository..."
	git clone $(REPO_URL)
	cd $(REPO_NAME) && git submodule update --init --recursive

# Initialize submodules
.PHONY: init-submodule
init-submodule:
	@echo "Initializing submodule sbeacon & svep ..."
	git submodule update --init --recursive

# Initialize sBeacon
.PHONY: init-sbeacon
init-sbeacon:
	@echo "Initializing sBeacon..."
	cd $(REPO_NAME)/sbeacon && ./init.sh

# Deploy to Hub01
.PHONY: deploy-hub01
deploy-hub01:
	@( \
		set -e; \
		export AWS_PROFILE="GXC-TF-User-Executor-Hub01"; \
		export AWS_DEFAULT_REGION="$(AWS_REGION)"; \
		echo "Starting Hub01 deployment..."; \
		$(MAKE) set-hub01-env && \
		$(MAKE) init-submodule && \
		$(MAKE) init-terraform && \
		$(MAKE) apply-terraform; \
	)

# Deploy to Hub02
.PHONY: deploy-hub02
deploy-hub02:
	@( \
		set -e; \
		export AWS_PROFILE="GXC-TF-User-Executor-Hub02"; \
		export AWS_DEFAULT_REGION="$(AWS_REGION)"; \
		echo "Starting Hub02 deployment..."; \
		$(MAKE) set-hub02-env && \
		$(MAKE) init-submodule && \
		$(MAKE) init-terraform && \
		$(MAKE) apply-terraform; \
	)

# Set Hub01 environment
.PHONY: set-hub01-env
set-hub01-env:
	@( \
		set -e; \
		echo "Setting Hub01 environment..."; \
		unset AWS_SESSION_TOKEN AWS_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID; \
		export AWS_PROFILE="GXC-TF-User-Executor-Hub01"; \
		export AWS_DEFAULT_REGION="$(AWS_REGION)"; \
		echo "Using AWS Profile: $$AWS_PROFILE"; \
		echo "Using AWS Region: $$AWS_DEFAULT_REGION"; \
		aws sts get-caller-identity --profile "$$AWS_PROFILE" || exit 1; \
		source $(PYTHON_ENV); \
	)

# Set Hub02 environment
.PHONY: set-hub02-env
set-hub02-env:
	@( \
		set -e; \
		echo "Setting Hub02 environment..."; \
		unset AWS_SESSION_TOKEN AWS_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID; \
		export AWS_PROFILE="GXC-TF-User-Executor-Hub02"; \
		export AWS_DEFAULT_REGION="$(AWS_REGION)"; \
		echo "Using AWS Profile: $$AWS_PROFILE"; \
		echo "Using AWS Region: $$AWS_DEFAULT_REGION"; \
		aws sts get-caller-identity --profile "$$AWS_PROFILE" || exit 1; \
		source $(PYTHON_ENV); \
	)

# Initialize Terraform
.PHONY: init-terraform
init-terraform:
	@( \
		set -e; \
		echo "Initializing Terraform..."; \
		if [ -z "$$AWS_PROFILE" ]; then \
			echo "Error: AWS_PROFILE is not set"; \
			exit 1; \
		fi; \
		terraform init && \
		terraform workspace new staging || true && \
		terraform workspace select staging; \
	)

# Plan Terraform changes
.PHONY: plan
plan:
	@( \
		set -e; \
		echo "Planning Terraform changes..."; \
		if [ -z "$$AWS_PROFILE" ]; then \
			echo "Error: AWS_PROFILE is not set"; \
			exit 1; \
		fi; \
		terraform plan; \
	)

# Apply Terraform changes
.PHONY: apply-terraform
apply-terraform:
	@( \
		set -e; \
		echo "Applying Terraform changes..."; \
		if [ -z "$$AWS_PROFILE" ]; then \
			echo "Error: AWS_PROFILE is not set"; \
			exit 1; \
		fi; \
		terraform apply; \
	)

# Apply Terraform changes with auto-approve
.PHONY: apply-terraform-autoapprove
apply-terraform-autoapprove:
	@( \
		set -e; \
		echo "Applying Terraform changes with auto-approve..."; \
		if [ -z "$$AWS_PROFILE" ]; then \
			echo "Error: AWS_PROFILE is not set"; \
			exit 1; \
		fi; \
		terraform apply -auto-approve; \
	)

# Show Terraform output
.PHONY: output
output:
	@echo "Showing Terraform output..."
	terraform output

# Clean up
.PHONY: clean
clean:
	@echo "Cleaning up..."
	rm -rf $(REPO_NAME)

# Version check of installed tools
.PHONY: version-check
version-check:
	@echo "Checking installed versions..."
	@echo "Node.js version: $$(node --version)"
	@echo "pnpm version: $$(pnpm --version)"
	@echo "Docker version: $$(docker --version)"
	@echo "Docker Compose version: $$(docker compose version)"
	@echo "Terraform version: $$(terraform version)"
	@echo "Python version: $$(python3 --version)"
	@echo "AWS CLI version: $$(aws --version)"

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all              - Install dependencies, clone repository and deploy to Hub01 (default)"
	@echo "  install-deps     - Install all dependencies (nvm, Node.js, pnpm, Docker)"
	@echo "  install-nvm      - Install NVM (Node Version Manager)"
	@echo "  install-node     - Install Node.js using NVM"
	@echo "  install-pnpm     - Install pnpm package manager"
	@echo "  install-docker   - Install Docker and Docker Compose"
	@echo "  clone            - Clone the repository and init submodules"
	@echo "  init-submodule   - Initialize submodules (sbeacon & svep)"
	@echo "  init-sbeacon     - Initialize sBeacon"
	@echo "  deploy-hub01     - Deploy to Hub01"
	@echo "  deploy-hub02     - Deploy to Hub02"
	@echo "  plan             - Run terraform plan"
	@echo "  apply-terraform  - Apply terraform changes (with confirmation)"
	@echo "  apply-terraform-autoapprove - Apply terraform changes (auto-approve)"
	@echo "  output           - Show terraform output"
	@echo "  version-check    - Check versions of installed tools"
	@echo "  clean            - Clean up repository"
	@echo "  help             - Show this help message"