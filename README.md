# GCN Application Startup Script

This repository contains scripts to easily start all components of the GCN application in one go.

## Prerequisites

- WSL (Windows Subsystem for Linux) with PostgreSQL installed
- Python 3.x
- Node.js and npm

## How to Use

### Option 1: Using the batch file (Windows)

Simply double-click the `start_app.bat` file or run it from the command line:

```
start_app.bat
```

### Option 2: Running the Python script directly

```
python start_app.py
```

## What Does This Do?

The script starts all the following components in this order:

1. PostgreSQL database service in WSL
2. Python AI backend (`main.py` in the `new_ai_backend` directory)
3. Node.js backend server (`server.js` in the `backend` directory)
4. Frontend development server (using `npm run dev` in the `frontend` directory)

## Stopping the Application

Press Ctrl+C in the console window to gracefully shut down all services.

## Troubleshooting

If any service fails to start:

- Check if the required ports are already in use
- Ensure PostgreSQL is properly installed in your WSL instance
- Verify that all dependencies are installed for each component
