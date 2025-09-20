#!/bin/bash
echo "{\"version\": \"$(git describe --tags --dirty=+)\"}"
