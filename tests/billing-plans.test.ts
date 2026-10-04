import assert from 'node:assert/strict'
import test from 'node:test'
import { getBillingPlan, isCompletedCheckout } from '../src/lib/billing-plans.ts'

test('accepts only supported billing plan nicknames', () => {
  assert.deepEqual(getBillingPlan('Pro'), { tier: 'Pro', credits: '100' })
  assert.deepEqual(getBillingPlan('Unlimited'), { tier: 'Unlimited', credits: 'Unlimited' })
  assert.equal(getBillingPlan('Internal price'), null)
  assert.equal(getBillingPlan(null), null)
})

test('requires a completed checkout with settled or free payment', () => {
  assert.equal(isCompletedCheckout('complete', 'paid'), true)
  assert.equal(isCompletedCheckout('complete', 'no_payment_required'), true)
  assert.equal(isCompletedCheckout('open', 'paid'), false)
  assert.equal(isCompletedCheckout('complete', 'unpaid'), false)
})
