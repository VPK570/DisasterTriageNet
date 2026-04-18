// Shared socket.io-client instance.
// Import `socket` from here instead of calling io() inline.
// autoConnect: false — App.jsx calls socket.connect() / socket.disconnect()
// to control the lifecycle explicitly.
import { io } from 'socket.io-client';
import { WS_BASE } from './config';

export const socket = io(WS_BASE, { autoConnect: false });
