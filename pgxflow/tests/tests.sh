set -e

wget https://github.com/PharmGKB/PharmCAT/releases/download/v2.15.5/pharmcat-2.15.5-all.jar -O pharmcat.jar
pytest -p no:warnings -vv test_pharmcat.py