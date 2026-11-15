import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesiumStatic';

createRoot(document.getElementById('root')!).render(<App />);
