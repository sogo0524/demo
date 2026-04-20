# Driver Fatigue Intervention Demo

Public-demo architecture for the Driver Fatigue Intervention System:

- `frontend/` is the Vite + React demo UI for Vercel.
- `backend/` is the FastAPI video analysis API for Render.
- `backend/models/` contains the ResNet18 fatigue classifier and metadata used by the Python pipeline.

## Backend API

Endpoints:

- `GET /health`
- `POST /analyze`

`POST /analyze` accepts multipart form data:

- `video`: MP4, MOV, M4V, or WEBM file
- `driving_duration_min`: number
- `time_since_last_break_min`: number

The API returns reviewer-friendly fields plus the existing detailed session payload used by the UI:

```json
{
  "success": true,
  "risk_score": 0.78,
  "fatigue_level": "high",
  "recommended_action": "take_break",
  "explanation": "Detected high fatigue risk from sampled video frames and manual driving context."
}
```

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

For local frontend testing, keep `frontend/.env` as:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAX_UPLOAD_MB=50
```

## Deploy Backend to Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from the repository, or create a Web Service manually.
3. If using the included `render.yaml`, Render deploys from `backend/`.
4. Confirm these settings:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/health`
5. After deploy, copy the Render service URL, such as `https://driver-fatigue-intervention-api.onrender.com`.

Useful backend environment variables:

- `FATIGUE_CORS_ORIGINS`: comma-separated allowed frontend origins. Use your Vercel URL in production.
- `FATIGUE_MAX_UPLOAD_MB`: upload limit in MB. Default: `50`.
- `FATIGUE_MAX_FRAMES`: optional cap for sampled frames. Render blueprint sets `120` to reduce demo latency.
- `FATIGUE_FRAME_INTERVAL_SEC`: video sampling interval. Default: `0.5`.
- `FATIGUE_DEVICE`: `cpu` or `cuda`. Render should use `cpu`.
- `FATIGUE_MODEL_PATH`: optional override for the model file.
- `FATIGUE_METADATA_PATH`: optional override for model metadata.

## Deploy Frontend to Vercel

1. Import the same repository in Vercel.
2. Set the Vercel project root directory to `frontend`.
3. Set environment variables:
   - `VITE_API_BASE_URL`: your Render URL, for example `https://driver-fatigue-intervention-api.onrender.com`
   - `VITE_MAX_UPLOAD_MB`: `50`
4. Deploy.
5. Open the Vercel URL and upload a short MP4, MOV, M4V, or WEBM clip.

## Notes

- The recording entry point is still shown as part of the product flow, but it remains a placeholder. External reviewers should use upload.
- Keep reviewer test clips short. The backend samples frames and runs CPU inference, so long videos can be slow on Render free instances.
- The backend keeps compatibility routes at `/api/health` and `/api/analyze`, but the frontend now calls `/health` and `/analyze`.
