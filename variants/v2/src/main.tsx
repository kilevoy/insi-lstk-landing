import { hydrateRoot } from 'react-dom/client';
import Landing from './landing';
import './globals.css';

hydrateRoot(document.getElementById('root')!, <Landing/>);
