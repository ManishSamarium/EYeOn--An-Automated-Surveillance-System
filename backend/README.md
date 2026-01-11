# Backend Setup Notes

This file contains quick instructions for installing backend dependencies required for face encoding/recognition, particularly on Windows where `dlib`/`face_recognition` can be difficult to build.

Recommended steps (Windows):

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
```

2. Install pre-built wheel for `face_recognition` that matches your Python version (example for Python 3.11 64-bit):

```powershell
pip install https://github.com/ageitgey/face_recognition/releases/download/v1.4.0/face_recognition-1.4.0-cp311-cp311-win_amd64.whl
```

3. Install the rest of the requirements:

```powershell
pip install -r ../requirements.txt
```

Alternative (recommended if you use Conda):

```bash
conda create -n eyeon python=3.11
conda activate eyeon
conda install -c conda-forge dlib face_recognition
pip install -r ../requirements.txt
```

Verification:

```bash
python -c "import face_recognition, cv2, numpy; print('OK', face_recognition.__version__)"
```

If you run into build errors, check that Visual Studio Build Tools and CMake are installed, or use the wheel/conda approach above.

Runtime tip: if your server invokes Python (e.g. `encode_face.py`), ensure the process uses the same Python environment that has `face_recognition` installed. You can either activate the conda environment before starting the Node server, or set the `PYTHON_EXECUTABLE` environment variable to the full path of the correct Python executable (e.g. `C:\Users\umyad\miniconda3\envs\eyeon\python.exe`). The routes will prefer `process.env.PYTHON_EXECUTABLE` when present.
