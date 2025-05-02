// WebSocket connection handler
let socket: WebSocket | null = null;

// Determine WebSocket protocol based on the current page protocol
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host;
const wsUrl = `${wsProtocol}//${wsHost}/ws`;

// Event callbacks
const listeners: Record<string, Array<(data: any) => void>> = {};

// Connect to WebSocket
export function connectToWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('WebSocket already connected or connecting');
    return;
  }

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        
        console.log('WebSocket message received:', type, data);
        
        // Dispatch custom event for components to listen to
        const customEvent = new CustomEvent(`ws:${type}`, { detail: data });
        document.dispatchEvent(customEvent);
        
        // Notify all listeners for this event type
        if (listeners[type]) {
          listeners[type].forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        connectToWebSocket();
      }, 5000);
    };
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
  }
}

// Register event listener
export function onWebSocketEvent(type: string, callback: (data: any) => void) {
  if (!listeners[type]) {
    listeners[type] = [];
  }
  
  listeners[type].push(callback);
  
  // Return a function to unregister the listener
  return () => {
    listeners[type] = listeners[type].filter(cb => cb !== callback);
  };
}

// Send message through WebSocket
export function sendWebSocketMessage(type: string, data: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
  } else {
    console.warn('WebSocket not connected, unable to send message');
  }
}

// Disconnect WebSocket
export function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}