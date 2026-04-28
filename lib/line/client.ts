import { messagingApi } from '@line/bot-sdk'

const { MessagingApiClient } = messagingApi

/**
 * LINE Messaging API Client singleton
 * 用於推播訊息、取得使用者資料等
 */
function createLineClient(): messagingApi.MessagingApiClient {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!channelAccessToken) {
    throw new Error('請在 .env.local 設定 LINE_CHANNEL_ACCESS_TOKEN')
  }

  return new MessagingApiClient({
    channelAccessToken,
  })
}

// Lazy singleton
let _client: messagingApi.MessagingApiClient | null = null

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!_client) {
    _client = createLineClient()
  }
  return _client
}
