import React from 'react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { render, act, fireEvent } from '@testing-library/react'
import {
  DataSheetGrid,
  DynamicDataSheetGrid,
  Column,
  textColumn,
  keyColumn,
  DataSheetGridRef,
} from '../src'

jest.mock('react-resize-detector', () => ({
  useResizeDetector: () => ({ width: 100, height: 100 }),
}))

class MockDataTransfer {
  data: Record<string, string> = {}
  setData(format: string, data: string) {
    this.data[format] = data
  }
}

const copy = () => {
  const clipboardData = new MockDataTransfer()
  fireEvent.copy(document, { clipboardData })
  return clipboardData.data
}

// --- Column removal / hiding ---

test('activeCell clamps when selected column is removed', () => {
  const data = [{ a: 'a0', b: 'b0', c: 'c0' }]
  const cols3: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
    keyColumn('c', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={cols3} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))
  expect(ref.current.activeCell).toEqual({ col: 2, colId: 'c', row: 0 })

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={cols2} ref={ref} />)
  })

  expect(ref.current.activeCell).toEqual({ col: 1, colId: 'b', row: 0 })
})

test('selection max clamps when columns are removed', () => {
  const data = [
    { a: 'a0', b: 'b0', c: 'c0' },
    { a: 'a1', b: 'b1', c: 'c1' },
  ]
  const cols3: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
    keyColumn('c', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={cols3} ref={ref} />
  )

  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 2, row: 1 },
    })
  )
  expect(ref.current.selection?.max.colId).toBe('c')

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={cols2} ref={ref} />)
  })

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'a', row: 0 },
    max: { col: 1, colId: 'b', row: 1 },
  })
})

test('activeCell becomes null when all columns are removed', () => {
  const data = [{ a: 'a0' }]
  const cols1: Column[] = [keyColumn('a', textColumn)]
  const colsEmpty: Column[] = []
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={cols1} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))
  expect(ref.current.activeCell).not.toBeNull()

  act(() => {
    rerender(
      <DynamicDataSheetGrid value={data} columns={colsEmpty} ref={ref} />
    )
  })

  expect(ref.current.activeCell).toBeNull()
  expect(ref.current.selection).toBeNull()
})

test('activeCell in non-removed column stays unchanged', () => {
  const data = [{ a: 'a0', b: 'b0', c: 'c0' }]
  const cols3: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
    keyColumn('c', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={cols3} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={cols2} ref={ref} />)
  })

  expect(ref.current.activeCell).toEqual({ col: 0, colId: 'a', row: 0 })
})

// --- Column replacement ---

test('colId reflects new column after replacement at same position', () => {
  const data = [{ a: 'a0', b: 'b0', x: 'x0' }]
  const cols1: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('x', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={cols1} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  expect(ref.current.activeCell?.colId).toBe('b')

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={cols2} ref={ref} />)
  })

  expect(ref.current.activeCell).toEqual({ col: 1, colId: 'x', row: 0 })
})

test('Delete key uses new column deleteValue after replacement', () => {
  const data = [{ a: 'a0', b: 'b0', x: 'x0' }]
  const cols1: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('x', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()
  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      columns={cols1}
      onChange={onChange}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))

  act(() => {
    rerender(
      <DynamicDataSheetGrid
        value={data}
        columns={cols2}
        onChange={onChange}
        ref={ref}
      />
    )
  })

  userEvent.keyboard('[Delete]')

  expect(onChange).toHaveBeenCalledWith(
    [{ a: 'a0', b: 'b0', x: null }],
    [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: 1 }]
  )
})

test('onActiveCellChange reports new colId after column replacement', () => {
  const data = [{ a: 'a0', b: 'b0', x: 'x0' }]
  const cols1: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const cols2: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('x', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const onActiveCellChange = jest.fn()
  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      columns={cols1}
      onActiveCellChange={onActiveCellChange}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  onActiveCellChange.mockClear()

  act(() => {
    rerender(
      <DynamicDataSheetGrid
        value={data}
        columns={cols2}
        onActiveCellChange={onActiveCellChange}
        ref={ref}
      />
    )
  })

  expect(onActiveCellChange).toHaveBeenCalledWith({
    cell: { col: 1, colId: 'x', row: 0 },
  })
})

// --- Column reorder ---

test('activeCell colId reflects reordered column', () => {
  const data = [{ a: 'a0', b: 'b0', c: 'c0' }]
  const colsABC: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
    keyColumn('c', textColumn),
  ]
  const colsCAB: Column[] = [
    keyColumn('c', textColumn),
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={colsABC} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))
  expect(ref.current.activeCell?.colId).toBe('a')

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={colsCAB} ref={ref} />)
  })

  expect(ref.current.activeCell).toEqual({ col: 0, colId: 'c', row: 0 })
})

test('copy uses reordered column copyValue', () => {
  const data = [{ a: 'a0', b: 'b0' }]
  const colsAB: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const colsBA: Column[] = [
    keyColumn('b', textColumn),
    keyColumn('a', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const { rerender } = render(
    <DynamicDataSheetGrid value={data} columns={colsAB} ref={ref} />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))

  expect(copy()).toEqual({
    'text/html': '<table><tr><td>a0</td></tr></table>',
    'text/plain': 'a0',
  })

  act(() => {
    rerender(<DynamicDataSheetGrid value={data} columns={colsBA} ref={ref} />)
  })

  expect(copy()).toEqual({
    'text/html': '<table><tr><td>b0</td></tr></table>',
    'text/plain': 'b0',
  })
})

test('onSelectionChange reports correct colIds after reorder', () => {
  const data = [
    { a: 'a0', b: 'b0' },
    { a: 'a1', b: 'b1' },
  ]
  const colsAB: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const colsBA: Column[] = [
    keyColumn('b', textColumn),
    keyColumn('a', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  const onSelectionChange = jest.fn()
  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      columns={colsAB}
      onSelectionChange={onSelectionChange}
      ref={ref}
    />
  )

  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 1, row: 1 },
    })
  )
  onSelectionChange.mockClear()

  act(() => {
    rerender(
      <DynamicDataSheetGrid
        value={data}
        columns={colsBA}
        onSelectionChange={onSelectionChange}
        ref={ref}
      />
    )
  })

  expect(onSelectionChange).toHaveBeenCalledWith({
    selection: {
      min: { col: 0, colId: 'b', row: 0 },
      max: { col: 1, colId: 'a', row: 1 },
    },
  })
})

// --- Normal selection behavior (regression) ---

test('row selection via setSelection still works', () => {
  const data = [
    { a: 'a0', b: 'b0' },
    { a: 'a1', b: 'b1' },
  ]
  const cols: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  render(<DataSheetGrid value={data} columns={cols} ref={ref} />)

  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 1 },
      max: { col: 1, row: 1 },
    })
  )

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'a', row: 1 },
    max: { col: 1, colId: 'b', row: 1 },
  })
})

test('column selection via setSelection still works', () => {
  const data = [
    { a: 'a0', b: 'b0' },
    { a: 'a1', b: 'b1' },
  ]
  const cols: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  render(<DataSheetGrid value={data} columns={cols} ref={ref} />)

  act(() =>
    ref.current.setSelection({
      min: { col: 1, row: 0 },
      max: { col: 1, row: 1 },
    })
  )

  expect(ref.current.selection).toEqual({
    min: { col: 1, colId: 'b', row: 0 },
    max: { col: 1, colId: 'b', row: 1 },
  })
})

test('multi-cell selection with keyboard expansion still works', () => {
  const data = [
    { a: 'a0', b: 'b0' },
    { a: 'a1', b: 'b1' },
  ]
  const cols: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  render(<DataSheetGrid value={data} columns={cols} ref={ref} />)

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))

  userEvent.keyboard('{Shift>}[ArrowRight][ArrowDown]{/Shift}')

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'a', row: 0 },
    max: { col: 1, colId: 'b', row: 1 },
  })
})

test('Ctrl+A select all still works', () => {
  const data = [
    { a: 'a0', b: 'b0' },
    { a: 'a1', b: 'b1' },
  ]
  const cols: Column[] = [
    keyColumn('a', textColumn),
    keyColumn('b', textColumn),
  ]
  const ref = { current: null as unknown as DataSheetGridRef }
  render(<DataSheetGrid value={data} columns={cols} ref={ref} />)

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))

  userEvent.keyboard('[MetaLeft>]a[/MetaLeft]')

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'a', row: 0 },
    max: { col: 1, colId: 'b', row: 1 },
  })
})
