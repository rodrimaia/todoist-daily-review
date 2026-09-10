import { expect, test } from 'bun:test'
import { keyIntent, layoutForWidth, render, routeFromArgs, VERSION } from './main'

test('routes safely and supports help/version', () => {
  expect(routeFromArgs([])).toBe('home')
  expect(routeFromArgs(['daily'])).toBe('daily')
  expect(routeFromArgs(['--help'])).toBe('help')
  expect(routeFromArgs(['--version'])).toBe('version')
  expect(routeFromArgs(['--token=secret'])).toBe('error')
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
})

test('maps only unmodified navigation keys to intents', () => {
  expect(keyIntent('j')).toBe('next')
  expect(keyIntent('\u001b[A')).toBe('previous')
  expect(keyIntent('\r')).toBe('select')
  expect(keyIntent('q')).toBe('back')
  expect(keyIntent('x')).toBe('quit')
  expect(keyIntent('J')).toBe('none')
})

test('renders compact and wide layouts without release advertising', () => {
  expect(layoutForWidth(71)).toBe('compact')
  expect(layoutForWidth(72)).toBe('wide')
  expect(render('daily', 60)).toContain('Daily Review')
  expect(render('home', 100)).not.toContain('Hosted')
})
