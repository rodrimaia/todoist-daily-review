import { expect, test } from 'bun:test'
import { formatTaskTextForClipboard, parseTaskText } from './task-information'

test('Task information links', () => {
  expect(parseTaskText('Read [reference](https://example.com/a) at https://example.org.')).toEqual([
    { text: 'Read ' },
    { text: 'reference', href: 'https://example.com/a' },
    { text: ' at ' },
    { text: 'https://example.org', href: 'https://example.org' },
    { text: '.' },
  ])
  expect(parseTaskText('[unsafe](javascript:alert(1))')).toEqual([{ text: '[unsafe](javascript:alert(1))' }])
  expect(parseTaskText('[broken](https://example.com')).toEqual([{ text: '[broken](https://example.com' }])
})

test('Task information clipboard formatting retains only hidden, unique destinations', () => {
  expect(formatTaskTextForClipboard('See [one](https://example.com) and [two](https://example.com)\nhttps://visible.test')).toBe(
    'See one and two\nhttps://visible.test\n\nLinks:\nhttps://example.com',
  )
  expect(formatTaskTextForClipboard('[site](https://visible.test) https://visible.test')).toBe('site https://visible.test')
})
