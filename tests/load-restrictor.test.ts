import { expect, it } from 'vitest'
import { appendLoadRestrictor } from '../src/load-restrictor.js'

it('appends load restrictor when absent', () => {
  expect(appendLoadRestrictor(['--enable-helm'], 'LoadRestrictionsNone')).toStrictEqual([
    '--enable-helm',
    '--load-restrictor',
    'LoadRestrictionsNone',
  ])
})

it('does not duplicate a separate load restrictor argument', () => {
  expect(appendLoadRestrictor(['--load-restrictor', 'LoadRestrictionsNone'], 'LoadRestrictionsRootOnly')).toStrictEqual(
    ['--load-restrictor', 'LoadRestrictionsNone'],
  )
})

it('does not duplicate an inline load restrictor argument', () => {
  expect(appendLoadRestrictor(['--load-restrictor=LoadRestrictionsNone'], 'LoadRestrictionsRootOnly')).toStrictEqual([
    '--load-restrictor=LoadRestrictionsNone',
  ])
})

it('leaves args unchanged when load restrictor is empty', () => {
  expect(appendLoadRestrictor(['--enable-helm'], '')).toStrictEqual(['--enable-helm'])
})
