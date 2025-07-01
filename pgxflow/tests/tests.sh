set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"

export PATH=$PATH:$SCRIPT_DIR/../layers/binaries/bin
wget https://github.com/PharmGKB/PharmCAT/releases/download/v2.15.5/pharmcat-2.15.5-all.jar -O pharmcat.jar
pytest -p no:warnings -vv ./test_pharmcat/ 
pytest -p no:warnings -vv ./test_lookup/