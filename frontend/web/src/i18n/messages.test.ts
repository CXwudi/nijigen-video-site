/**
 * Catalog and message-function integration tests.
 *
 * Verifies that each committed message function returns the expected
 * English and Simplified Chinese output.  Tests target only the messages
 * rendered by the current homepage (`index.tsx`) and root document
 * (`__root.tsx`); speculative or future-facing messages are intentionally
 * excluded.
 */

import { describe, expect, it } from 'vitest'
import * as m from '#/paraglide/messages.js'

describe('message catalogs', () => {
  // -----------------------------------------------------------------------
  // Root document
  // -----------------------------------------------------------------------

  describe('app_name', () => {
    it('returns English product name', () => {
      expect(m.app_name({}, { locale: 'en' })).toBe('Nijigen Video')
    })

    it('returns unchanged product name in Simplified Chinese', () => {
      // Product name is intentionally identical in both locales.
      expect(m.app_name({}, { locale: 'zh-CN' })).toBe('Nijigen Video')
    })
  })

  // -----------------------------------------------------------------------
  // Home page — header
  // -----------------------------------------------------------------------

  describe('home_heading', () => {
    it('returns "Workspace" in English', () => {
      expect(m.home_heading({}, { locale: 'en' })).toBe('Workspace')
    })

    it('returns "工作区" in Simplified Chinese', () => {
      expect(m.home_heading({}, { locale: 'zh-CN' })).toBe('工作区')
    })
  })

  describe('home_new_upload', () => {
    it('returns "New upload" in English', () => {
      expect(m.home_new_upload({}, { locale: 'en' })).toBe('New upload')
    })

    it('returns "新建上传" in Simplified Chinese', () => {
      expect(m.home_new_upload({}, { locale: 'zh-CN' })).toBe('新建上传')
    })
  })

  // -----------------------------------------------------------------------
  // Home page — statistics labels
  // -----------------------------------------------------------------------

  describe('home_stat_anime_clips', () => {
    it('returns "Anime clips" in English', () => {
      expect(m.home_stat_anime_clips({}, { locale: 'en' })).toBe('Anime clips')
    })

    it('returns "动画片段" in Simplified Chinese', () => {
      expect(m.home_stat_anime_clips({}, { locale: 'zh-CN' })).toBe('动画片段')
    })
  })

  describe('home_stat_character_edits', () => {
    it('returns "Character edits" in English', () => {
      expect(m.home_stat_character_edits({}, { locale: 'en' })).toBe('Character edits')
    })

    it('returns "角色剪辑" in Simplified Chinese', () => {
      expect(m.home_stat_character_edits({}, { locale: 'zh-CN' })).toBe('角色剪辑')
    })
  })

  describe('home_stat_uploads_waiting', () => {
    it('returns "Uploads waiting" in English', () => {
      expect(m.home_stat_uploads_waiting({}, { locale: 'en' })).toBe('Uploads waiting')
    })

    it('returns "待上传" in Simplified Chinese', () => {
      expect(m.home_stat_uploads_waiting({}, { locale: 'zh-CN' })).toBe('待上传')
    })
  })

  // -----------------------------------------------------------------------
  // Home page — review queue section
  // -----------------------------------------------------------------------

  describe('home_review_queue_heading', () => {
    it('returns "Review queue" in English', () => {
      expect(m.home_review_queue_heading({}, { locale: 'en' })).toBe('Review queue')
    })

    it('returns "审核队列" in Simplified Chinese', () => {
      expect(m.home_review_queue_heading({}, { locale: 'zh-CN' })).toBe('审核队列')
    })
  })

  describe('home_review_queue_empty', () => {
    it('returns the empty-state message in English', () => {
      expect(m.home_review_queue_empty({}, { locale: 'en' })).toBe(
        'No videos are waiting for review yet.',
      )
    })

    it('returns "暂无视频等待审核。" in Simplified Chinese', () => {
      expect(m.home_review_queue_empty({}, { locale: 'zh-CN' })).toBe('暂无视频等待审核。')
    })
  })

  describe('home_review_queue_badge_empty', () => {
    it('returns "Empty" in English', () => {
      expect(m.home_review_queue_badge_empty({}, { locale: 'en' })).toBe('Empty')
    })

    it('returns "空" in Simplified Chinese', () => {
      expect(m.home_review_queue_badge_empty({}, { locale: 'zh-CN' })).toBe('空')
    })
  })

  // -----------------------------------------------------------------------
  // Language switcher accessibility
  // -----------------------------------------------------------------------

  describe('language_switcher_label', () => {
    it('returns "Language" in English', () => {
      expect(m.language_switcher_label({}, { locale: 'en' })).toBe('Language')
    })

    it('returns "语言" in Simplified Chinese', () => {
      expect(m.language_switcher_label({}, { locale: 'zh-CN' })).toBe('语言')
    })
  })
})
