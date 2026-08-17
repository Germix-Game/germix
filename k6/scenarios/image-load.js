// Standalone check: how fast do the actual card image assets load under
// concurrency, independent of the gameplay API. Hits real /assets/*.webp
// paths (from public/assets) directly — this is what CardSlot.tsx's
// resolveImageSrc() ultimately requests in the browser.
//
// Run:
//   $env:BASE_URL="https://germix-staging.vercel.app"; k6 run k6/scenarios/image-load.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const MAX_VUS = Number(__ENV.MAX_VUS || 100)

const images = new SharedArray('images', function () {
  return JSON.parse(open('../data/images.json'))
})

export const options = {
  scenarios: {
    images: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: MAX_VUS },
        { duration: '60s', target: MAX_VUS },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

export default function () {
  const path = images[Math.floor(Math.random() * images.length)]
  const res = http.get(`${BASE_URL}${path}`)
  check(res, { 'image 200': (r) => r.status === 200 })
  sleep(0.2)
}
