export const appConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'https://autorepost-api-l4oy.onrender.com/api',
  websocketUrl: process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000'
};
