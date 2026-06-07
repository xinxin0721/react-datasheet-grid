import { getRowKey } from './Grid'

type Row = { id: string; name: string }

const data: Row[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Charlie' },
]

describe('getRowKey with string rowKey', () => {
  test('returns the correct key for each row', () => {
    expect(getRowKey(data, 0, 'id')).toBe('a')
    expect(getRowKey(data, 1, 'id')).toBe('b')
    expect(getRowKey(data, 2, 'id')).toBe('c')
  })

  test('returns correct keys after first row is deleted', () => {
    const afterDelete = data.slice(1) // ['b', 'c']
    expect(getRowKey(afterDelete, 0, 'id')).toBe('b')
    expect(getRowKey(afterDelete, 1, 'id')).toBe('c')
  })

  test('returns correct keys after rows are reordered', () => {
    const reordered: Row[] = [data[2], data[0], data[1]]
    expect(getRowKey(reordered, 0, 'id')).toBe('c')
    expect(getRowKey(reordered, 1, 'id')).toBe('a')
    expect(getRowKey(reordered, 2, 'id')).toBe('b')
  })

  test('returns index when key field does not exist', () => {
    expect(getRowKey(data, 0, 'nonexistent')).toBe(0)
    expect(getRowKey(data, 1, 'nonexistent')).toBe(1)
  })

  test('returns index when key value is not string or number', () => {
    const rows = [{ id: { nested: true } }, { id: null }]
    expect(getRowKey(rows, 0, 'id')).toBe(0)
    expect(getRowKey(rows, 1, 'id')).toBe(1)
  })

  test('works with numeric key values', () => {
    const rows = [{ id: 100 }, { id: 200 }]
    expect(getRowKey(rows, 0, 'id')).toBe(100)
    expect(getRowKey(rows, 1, 'id')).toBe(200)
  })
})

describe('getRowKey with function rowKey', () => {
  const rowKeyFn = ({ rowData, rowIndex }: { rowData: Row; rowIndex: number }) =>
    `${rowData.id}-${rowIndex}`

  test('returns the correct key for each row', () => {
    expect(getRowKey(data, 0, rowKeyFn)).toBe('a-0')
    expect(getRowKey(data, 1, rowKeyFn)).toBe('b-1')
    expect(getRowKey(data, 2, rowKeyFn)).toBe('c-2')
  })

  test('returns correct keys after first row is deleted', () => {
    const afterDelete = data.slice(1)
    expect(getRowKey(afterDelete, 0, rowKeyFn)).toBe('b-0')
    expect(getRowKey(afterDelete, 1, rowKeyFn)).toBe('c-1')
  })

  test('returns correct keys after rows are reordered', () => {
    const reordered: Row[] = [data[2], data[0], data[1]]
    expect(getRowKey(reordered, 0, rowKeyFn)).toBe('c-0')
    expect(getRowKey(reordered, 1, rowKeyFn)).toBe('a-1')
    expect(getRowKey(reordered, 2, rowKeyFn)).toBe('b-2')
  })

  test('receives correct rowData and rowIndex', () => {
    const spy = jest.fn(() => 'key')
    getRowKey(data, 1, spy)
    expect(spy).toHaveBeenCalledWith({ rowData: data[1], rowIndex: 1 })
  })
})

describe('getRowKey without rowKey', () => {
  test('falls back to index', () => {
    expect(getRowKey(data, 0)).toBe(0)
    expect(getRowKey(data, 1)).toBe(1)
    expect(getRowKey(data, 2)).toBe(2)
  })

  test('falls back to index with undefined rowKey', () => {
    expect(getRowKey(data, 0, undefined)).toBe(0)
  })
})
