#!/bin/bash

# Save the current directory
top_level_dir=$(pwd)

directories=("sbeacon" "svep" "pgxflow")

for dir in "${directories[@]}"; do
  echo "Running init.sh in $dir"
  
  cd "$top_level_dir/$dir" || { echo "Failed to cd into $dir"; exit 1; }

  if [ -x ./init.sh ]; then
    ./init.sh
  else
    echo "init.sh not found or not executable in $dir"
  fi
done

# Return to the top-level directory
cd "$top_level_dir"

echo "All init.sh scripts executed."