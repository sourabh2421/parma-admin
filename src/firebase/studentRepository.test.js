import { describe, expect, it } from 'vitest'
import {
  dedupeStudentsForImport,
  mapStudentDoc,
  sanitizeStudentDocId,
} from './studentRepository.js'

describe('studentRepository unit tests', () => {
  describe('sanitizeStudentDocId', () => {
    it('sanitizes slashes and whitespace', () => {
      expect(sanitizeStudentDocId(' 101/A ')).toBe('101_A')
      expect(sanitizeStudentDocId('101\\B')).toBe('101_B')
      expect(sanitizeStudentDocId('')).toBe('_empty')
      expect(sanitizeStudentDocId(null)).toBe('_empty')
    })
  })

  describe('dedupeStudentsForImport', () => {
    it('deduplicates students keeping the last row', () => {
      const input = [
        { id: '101', name: 'Student 1', class: 'I' },
        { id: '102', name: 'Student 2', class: 'II' },
        { id: '101', name: 'Student 1 Updated', class: 'I' },
      ]
      const deduped = dedupeStudentsForImport(input)
      expect(deduped).toHaveLength(2)
      expect(deduped.find((s) => s.id === '101')?.name).toBe('Student 1 Updated')
    })
  })

  describe('mapStudentDoc', () => {
    it('formats name, class, and resolved parent name in uppercase', () => {
      const mockSnap = {
        id: '1',
        data: () => ({
          studentId: '1',
          name: 'Kabir Yadav',
          parentName: 'Mr. Mukesh Yadav',
          class: 'nursery',
          deleted: false,
        }),
      }

      const mapped = mapStudentDoc(mockSnap)
      expect(mapped).toEqual({
        id: '1',
        name: 'KABIR YADAV',
        parentName: 'MR. MUKESH YADAV',
        class: 'NURSERY',
        createdAt: null,
        updatedAt: null,
      })
    })

    it('resolves class-like parent name to real father name in uppercase', () => {
      const mockSnap = {
        id: '1',
        data: () => ({
          studentId: '1',
          name: 'Kabir Yadav',
          parentName: 'NURSERY',
          class: 'NURSERY',
          deleted: false,
        }),
      }

      const mapped = mapStudentDoc(mockSnap)
      expect(mapped.parentName).toBe('MR. MUKESH YADAV')
    })

    it('returns null for deleted students', () => {
      const mockSnap = {
        id: '99',
        data: () => ({
          deleted: true,
        }),
      }
      expect(mapStudentDoc(mockSnap)).toBeNull()
    })
  })
})
