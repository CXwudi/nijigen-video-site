import { describe, expect, it } from 'vitest'

import { createQueryClient } from './router'

describe('createQueryClient', () => {
  it('creates an isolated query cache for each router instance', () => {
    const firstClient = createQueryClient()
    const secondClient = createQueryClient()

    expect(firstClient).not.toBe(secondClient)
    expect(firstClient.getQueryCache()).not.toBe(secondClient.getQueryCache())
  })
})
