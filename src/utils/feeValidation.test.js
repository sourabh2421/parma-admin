import { describe, it, expect } from 'vitest'
import { validateInputs } from './feeValidation'

describe('validateInputs - Task 5.1', () => {
  describe('Requirement 10.1: Amount validation (finite, non-negative)', () => {
    it('should accept valid positive integer amount', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should accept valid decimal amount', () => {
      const result = validateInputs({
        amount: '5000.50',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should accept zero amount', () => {
      const result = validateInputs({
        amount: '0',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should reject negative amount', () => {
      const result = validateInputs({
        amount: '-100',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should reject non-numeric amount', () => {
      const result = validateInputs({
        amount: 'abc',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should accept empty string amount (converts to 0, caught by HTML required)', () => {
      // Note: In practice, empty string is prevented by the HTML input's required attribute
      // Number('') evaluates to 0, which is finite and non-negative
      const result = validateInputs({
        amount: '',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should reject Infinity', () => {
      const result = validateInputs({
        amount: 'Infinity',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should reject NaN', () => {
      const result = validateInputs({
        amount: 'NaN',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })
  })

  describe('Requirement 10.3: Payment date validation (required when paid)', () => {
    it('should accept paid status with payment date', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'paid',
        paymentDate: new Date(),
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should accept pending status without payment date', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should reject paid status without payment date', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'paid',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Select a payment date for paid fees.' })
    })

    it('should accept pending status with payment date (date is optional when pending)', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: new Date(),
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })
  })

  describe('Requirement 10.2: Month selection in Multi-Month Mode (2-12 months)', () => {
    it('should accept 2 selected months', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['January', 'February']),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should accept 12 selected months (maximum)', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set([
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should accept any valid month count between 2-12', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['April', 'May', 'June', 'July', 'August']),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should reject 0 selected months in multi-month mode', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Select at least one month.' })
    })

    it('should reject 1 selected month in multi-month mode', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['January']),
      })
      expect(result).toEqual({ 
        valid: false, 
        error: 'Select at least 2 months for bulk creation, or use single month mode.' 
      })
    })

    it('should reject more than 12 selected months', () => {
      // Create a set with 13 months (artificially, for testing edge case)
      const tooManyMonths = new Set([
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December', 'Extra'
      ])
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: tooManyMonths,
      })
      expect(result).toEqual({ valid: false, error: 'Select at most 12 months.' })
    })
  })

  describe('Requirement 10.4: Validation consistency across modes', () => {
    it('should validate amount the same in Single Month Mode', () => {
      const result = validateInputs({
        amount: '-100',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should validate amount the same in Multi-Month Mode', () => {
      const result = validateInputs({
        amount: '-100',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['January', 'February']),
      })
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should validate payment date the same in Single Month Mode', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'paid',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: false, error: 'Select a payment date for paid fees.' })
    })

    it('should validate payment date the same in Multi-Month Mode', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'paid',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['January', 'February']),
      })
      expect(result).toEqual({ valid: false, error: 'Select a payment date for paid fees.' })
    })
  })

  describe('Combined validation scenarios', () => {
    it('should fail on first validation error when multiple issues exist', () => {
      const result = validateInputs({
        amount: 'invalid',
        status: 'paid',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(),
      })
      // Should return amount error first (validation order matters)
      expect(result).toEqual({ valid: false, error: 'Enter a valid fee amount.' })
    })

    it('should validate all requirements for valid multi-month paid submission', () => {
      const result = validateInputs({
        amount: '10000',
        status: 'paid',
        paymentDate: new Date('2026-04-15'),
        isMultiMonth: true,
        selectedMonths: new Set(['April', 'May', 'June']),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should handle edge case of exactly 2 months', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: true,
        selectedMonths: new Set(['December', 'November']),
      })
      expect(result).toEqual({ valid: true })
    })
  })

  describe('Return value structure', () => {
    it('should return { valid: true } on success with no error field', () => {
      const result = validateInputs({
        amount: '5000',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toHaveProperty('valid', true)
      expect(result).not.toHaveProperty('error')
    })

    it('should return { valid: false, error: string } on failure', () => {
      const result = validateInputs({
        amount: '-100',
        status: 'pending',
        paymentDate: null,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toHaveProperty('valid', false)
      expect(result).toHaveProperty('error')
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    })
  })

  describe('Partial payment and remaining amount validation', () => {
    it('should validate partial payment with totalAmount and remainingAmount', () => {
      const result = validateInputs({
        amount: '1500',
        totalAmount: '2000',
        remainingAmount: '500',
        status: 'paid',
        paymentDate: new Date(),
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result).toEqual({ valid: true })
    })

    it('should reject negative remainingAmount', () => {
      const result = validateInputs({
        amount: '1500',
        totalAmount: '2000',
        remainingAmount: '-500',
        status: 'paid',
        paymentDate: new Date(),
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('remaining fee')
    })
  })
})
