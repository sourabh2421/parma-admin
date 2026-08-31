import { describe, expect, it } from 'vitest'
import { numberToWordsIndian } from './numberToWords.js'

describe('numberToWordsIndian', () => {
  it('converts basic numbers', () => {
    expect(numberToWordsIndian(0)).toBe('Zero Rupees Only')
    expect(numberToWordsIndian(5)).toBe('Five Rupees Only')
    expect(numberToWordsIndian(15)).toBe('Fifteen Rupees Only')
    expect(numberToWordsIndian(20)).toBe('Twenty Rupees Only')
    expect(numberToWordsIndian(99)).toBe('Ninety Nine Rupees Only')
    expect(numberToWordsIndian(100)).toBe('One Hundred Rupees Only')
  })

  it('converts thousands, lakhs and crores correctly', () => {
    expect(numberToWordsIndian(1500)).toBe('One Thousand Five Hundred Rupees Only')
    expect(numberToWordsIndian(2000)).toBe('Two Thousand Rupees Only')
    expect(numberToWordsIndian(2550)).toBe('Two Thousand Five Hundred Fifty Rupees Only')
    expect(numberToWordsIndian(100000)).toBe('One Lakh Rupees Only')
    expect(numberToWordsIndian(1500000)).toBe('Fifteen Lakh Rupees Only')
    expect(numberToWordsIndian(10000000)).toBe('One Crore Rupees Only')
  })

  it('handles paise / decimals', () => {
    expect(numberToWordsIndian(1500.5)).toBe(
      'One Thousand Five Hundred Rupees and Fifty Paise Only',
    )
  })

  it('handles empty / invalid inputs safely', () => {
    expect(numberToWordsIndian('')).toBe('')
    expect(numberToWordsIndian(null)).toBe('')
    expect(numberToWordsIndian(undefined)).toBe('')
  })
})
