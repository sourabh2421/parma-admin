/**
 * Converts Indian Rupee numerical amounts into words.
 * Example: 2500 -> "Two Thousand Five Hundred Rupees Only"
 * Example: 1550.50 -> "One Thousand Five Hundred Fifty Rupees and Fifty Paise Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

function convertLessThanOneThousand(n) {
  let str = ''

  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `
    n %= 100
  }

  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `
    n %= 10
  }

  if (n > 0) {
    str += `${ONES[n]} `
  }

  return str.trim()
}

export function numberToWordsIndian(num) {
  if (num == null || isNaN(num) || num === '') return ''

  const n = Number(num)
  if (n === 0) return 'Zero Rupees Only'
  if (n < 0) return `Minus ${numberToWordsIndian(Math.abs(n))}`

  const integerPart = Math.floor(n)
  const decimalPart = Math.round((n - integerPart) * 100)

  let words = ''

  const crore = Math.floor(integerPart / 10000000)
  let remainder = integerPart % 10000000

  const lakh = Math.floor(remainder / 100000)
  remainder = remainder % 100000

  const thousand = Math.floor(remainder / 1000)
  const hundredAndBelow = remainder % 1000

  if (crore > 0) {
    words += `${convertLessThanOneThousand(crore)} Crore `
  }

  if (lakh > 0) {
    words += `${convertLessThanOneThousand(lakh)} Lakh `
  }

  if (thousand > 0) {
    words += `${convertLessThanOneThousand(thousand)} Thousand `
  }

  if (hundredAndBelow > 0) {
    words += `${convertLessThanOneThousand(hundredAndBelow)} `
  }

  words = words.trim()
  if (!words) {
    words = 'Zero'
  }

  words += ' Rupees'

  if (decimalPart > 0) {
    words += ` and ${convertLessThanOneThousand(decimalPart)} Paise`
  }

  words += ' Only'

  return words.replace(/\s+/g, ' ')
}
