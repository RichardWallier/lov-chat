export const env = {
  apiHttpUrl: process.env.NEXT_PUBLIC_API_HTTP_URL ?? '',
  apiWsUrl: process.env.NEXT_PUBLIC_API_WS_URL ?? '',
} as const;
