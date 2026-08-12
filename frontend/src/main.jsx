import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { resolveApiBase } from './api/client'

// Dò tìm backend (emulator 10.0.2.2 / máy thật IP LAN) TRƯỚC khi render
// để mọi component đọc API_BASE đều nhận đúng giá trị đã resolve.
resolveApiBase().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
