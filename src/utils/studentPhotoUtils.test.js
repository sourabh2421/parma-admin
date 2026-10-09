import { describe, expect, it } from 'vitest'
import {
  computePhotoHash,
  isPhotoUnchanged,
  normalizeNameForMatch,
  parsePhotoFilename,
  verifyStudentMatch,
} from './studentPhotoUtils.js'

describe('Student Photo Import Utilities', () => {
  describe('1. Filename Parsing', () => {
    it('correctly parses double-extension .jpg.jpg filenames', () => {
      expect(parsePhotoFilename('1.jpg.jpg')).toEqual({ sNo: 1, isValid: true })
      expect(parsePhotoFilename('10.jpg.jpg')).toEqual({ sNo: 10, isValid: true })
      expect(parsePhotoFilename('3171.jpg.jpg')).toEqual({ sNo: 3171, isValid: true })
    })

    it('tolerates single-extension .jpg and .jpeg', () => {
      expect(parsePhotoFilename('5.jpg')).toEqual({ sNo: 5, isValid: true })
      expect(parsePhotoFilename('42.jpeg')).toEqual({ sNo: 42, isValid: true })
      expect(parsePhotoFilename('100.JPG')).toEqual({ sNo: 100, isValid: true })
    })

    it('rejects invalid filenames', () => {
      expect(parsePhotoFilename('All student ID card list.xlsx')).toEqual({ sNo: null, isValid: false })
      expect(parsePhotoFilename('photo.png')).toEqual({ sNo: null, isValid: false })
      expect(parsePhotoFilename('')).toEqual({ sNo: null, isValid: false })
      expect(parsePhotoFilename(null)).toEqual({ sNo: null, isValid: false })
    })
  })

  describe('2. Name Normalization', () => {
    it('normalizes names by trimming, collapsing spaces, and stripping punctuation', () => {
      expect(normalizeNameForMatch('  Kabir   Yadav  ')).toBe('KABIR YADAV')
      expect(normalizeNameForMatch('ANVI YADAV')).toBe('ANVI YADAV')
      expect(normalizeNameForMatch('Mr. Devansh - Singh')).toBe('MR DEVANSH SINGH')
    })
  })

  describe('3. Student Matching & Name Verification', () => {
    const mockStudent = { id: '1', name: 'Kabir Yadav', class: 'NURSERY' }

    it('approves exact normalized name match', () => {
      const result = verifyStudentMatch({
        sNo: 1,
        excelName: 'Kabir Yadav',
        excelClass: 'NURSERY',
        dbStudent: mockStudent,
      })
      expect(result.status).toBe('MATCHED_EXACT')
      expect(result.isApproved).toBe(true)
      expect(result.targetStudentId).toBe('1')
    })

    it('flags name mismatch for human review', () => {
      const result = verifyStudentMatch({
        sNo: 28,
        excelName: 'Yati Pandey',
        excelClass: 'NURSERY',
        dbStudent: { id: '28', name: 'IRA Pandey', class: 'NURSERY' },
      })
      expect(result.status).toBe('NAME_MISMATCH')
      expect(result.isApproved).toBe(false)
      expect(result.note).toContain('Requires review')
    })

    it('requires explicit override for S.No 3171', () => {
      const resultWithoutOverride = verifyStudentMatch({
        sNo: 3171,
        excelName: 'Sanidhya',
        excelClass: 'XII',
        dbStudent: { id: '3171', name: 'Sanidhya', class: 'XII' },
      })
      expect(resultWithoutOverride.status).toBe('REVIEW_3171')
      expect(resultWithoutOverride.isApproved).toBe(false)

      const resultWithOverride = verifyStudentMatch({
        sNo: 3171,
        excelName: 'Sanidhya',
        excelClass: 'XII',
        dbStudent: { id: '3171', name: 'Sanidhya', class: 'XII' },
        photoOverrides: { '3171': '3171' },
      })
      expect(resultWithOverride.status).toBe('OVERRIDE_MATCH')
      expect(resultWithOverride.isApproved).toBe(true)
      expect(resultWithOverride.targetStudentId).toBe('3171')
    })

    it('handles student missing in database', () => {
      const result = verifyStudentMatch({
        sNo: 9999,
        excelName: 'Ghost Student',
        excelClass: 'I',
        dbStudent: null,
      })
      expect(result.status).toBe('MISSING_IN_DB')
      expect(result.isApproved).toBe(false)
    })
  })

  describe('4. Idempotency & Photo Hash Verification', () => {
    it('computes sha256 hash and recognizes identical files', () => {
      const buf1 = Buffer.from('test-image-data-1')
      const buf2 = Buffer.from('test-image-data-1')
      const buf3 = Buffer.from('test-image-data-2')

      const hash1 = computePhotoHash(buf1)
      const hash2 = computePhotoHash(buf2)
      const hash3 = computePhotoHash(buf3)

      expect(hash1).toBe(hash2)
      expect(hash1).not.toBe(hash3)
      expect(isPhotoUnchanged(hash1, hash2)).toBe(true)
      expect(isPhotoUnchanged(hash1, hash3)).toBe(false)
    })
  })
})
