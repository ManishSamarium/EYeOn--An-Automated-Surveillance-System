#!/usr/bin/env bash
# Render build script for the Python surveillance service.
# dlib (pulled in by face_recognition) compiles with g++/cmake in parallel and
# spikes RAM past Render's 8 GB ceiling. We force single-threaded builds.

set -euo pipefail

export MAKEFLAGS="-j1"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export PIP_NO_CACHE_DIR=1

python -m pip install --upgrade pip setuptools wheel

# Try a prebuilt dlib wheel first (saves 10+ min and ~6 GB of RAM). If it is
# unavailable for this interpreter, fall back to the standard sdist build.
pip install --only-binary=:all: "dlib==19.24.2" || pip install "dlib==19.24.2"

pip install -r requirements.txt
