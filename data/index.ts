import { Pattern } from './types'
import { fanOutEventPipeline } from './patterns/fan-out-event-pipeline'
import { cacheAside } from './patterns/cache-aside'
import { newsFeedTimeline } from './patterns/news-feed-timeline'
import { rateLimitingInfra } from './patterns/rate-limiting-infra'
import { distributedStorage } from './patterns/distributed-storage'
import { proximityGeo } from './patterns/proximity-geo'
import { realTimeStreaming } from './patterns/real-time-streaming'
import { searchRanking } from './patterns/search-ranking'
import { writeHeavyAppendOnly } from './patterns/write-heavy-append-only'

export const patterns: Pattern[] = [
  fanOutEventPipeline,
  cacheAside,
  newsFeedTimeline,
  rateLimitingInfra,
  distributedStorage,
  proximityGeo,
  realTimeStreaming,
  searchRanking,
  writeHeavyAppendOnly,
]

export const getPattern = (id: string): Pattern | undefined =>
  patterns.find((p) => p.id === id)
