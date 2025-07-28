# SonarQube Scan Script

This repository contains a shell script to scan your codebase using [SonarQube](https://www.sonarqube.org/) with the official SonarScanner CLI Docker image.

## Prerequisites

- [Docker](https://www.docker.com/) must be installed and running
- Access to a running SonarQube server
- A valid SonarQube token

## How to Run

1. Make sure you're in the root directory of your project.

2. Grant execute permission to the script (only once):

   ```bash
   chmod +x sonar-scan.sh
   ```

3. Run the script:

   ```bash
   ./sonar-scan.sh
   ```

## Configuration

The script uses the following environment variables:

```bash
SONAR_HOST_URL="http://<your-sonarqube-host>:9000"
SONAR_TOKEN="your_sonarqube_token"
PROJECT_DIR=$(pwd)/webgui/webapp/
```

You can edit these values at the top of `sonar-scan.sh` to match your setup.

## Notes

- Ensure the `PROJECT_DIR` contains a valid `sonar-project.properties` file or follows standard SonarScanner conventions.
- Logs will show the current environment variables used during execution to help with debugging.
