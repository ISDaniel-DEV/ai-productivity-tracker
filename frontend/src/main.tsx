import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'
import './palette.css'
import './dashboard.css'

async function start() {
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    await import('@oddbird/popover-polyfill')
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>,
  )
}
void start()
