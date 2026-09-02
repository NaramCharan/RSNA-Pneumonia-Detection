import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The FastAPI backend owns the model and serves four routes at the root:
//   GET  /samples              POST /predict
//   GET  /image/{id}           POST /predict/sample/{id}
// Proxying those exact paths keeps the frontend calling the documented
// contract verbatim, with no CORS setup in development and no /api prefix
// imposed on the Python side.
const API = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/samples': API,
      '/image': API,
      '/predict': API,
    },
  },
})
