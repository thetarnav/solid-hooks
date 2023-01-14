/* @refresh reload */
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import 'uno.css'

import App from './App'

const [showApp, setShowApp] = createSignal(true)

render(
  () => (
    <>
      <button
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          'z-index': 1,
          padding: '0.5rem',
        }}
        onClick={() => setShowApp(p => !p)}
      >
        Toggle App
      </button>
      {showApp() && <App />}
    </>
  ),
  document.getElementById('root')!,
)
