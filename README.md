# TechVruk

TechVruk is a lightweight AI spend audit app that helps teams review their AI tool subscriptions and generate a summary of usage, spend, and potential savings.

## Project overview

This project has two parts:

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express

The app lets users enter their team size, primary use case, and tool details, then sends the audit to the backend for processing and summary generation.

## Folder structure

```text
techvruk/
├── backend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
└── README.md
```

## Prerequisites

Make sure you have the following installed:

- Node.js 18+
- npm

## Setup

### 1. Install frontend dependencies

```bash
cd frontend
npm install
```

### 2. Install backend dependencies

```bash
cd ../backend
npm install
```

## Run the app

### Start the backend

```bash
cd backend
npm run dev
```

The backend will run using the development server and listen on the configured port.

### Start the frontend

```bash
cd frontend
npm run dev
```

Then open the Vite local URL shown in the terminal.

## Build for production

### Frontend

```bash
cd frontend
npm run build
```

### Backend

```bash
cd backend
npm start
```

## Environment variables

If your backend uses environment-based configuration, create a `.env` file in the backend folder and add the required values.

## Notes

- The frontend expects the backend API URL to be available.
- If needed, configure the frontend API base URL using the `VITE_API_URL` environment variable.

## License

This project is for demonstration and internal use unless otherwise stated.
