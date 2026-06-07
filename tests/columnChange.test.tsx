import React, { useState, useImperativeHandle, forwardRef } from 'react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { render, act } from '@testing-library/react'
import {
  DynamicDataSheetGrid,
  Column,
  textColumn,
  keyColumn,
  DataSheetGridRef,
} from '../src'

jest.mock('react-resize-detector', () => ({
  useResizeDetector: () => ({ width: 100, height: 100 }),
}))

type WrapperRef = {
  setColumns: (cols: Column[]) => void
}

const DynamicWrapper = forwardRef<
  WrapperRef,
  {
    dsgRef: React.MutableRefObject<DataSheetGridRef>
    initialColumns: Column[]
    data: any[]
    stickyRightColumn?: any
  }
>(({ dsgRef, initialColumns, data, stickyRightColumn }, ref) => {
  const [columns, setColumns] = useState(initialColumns)

  useImperativeHandle(ref, () => ({ setColumns }))

  return (
    <DynamicDataSheetGrid
      value={data}
      columns={columns}
      onChange={() => {}}
      ref={dsgRef}
      stickyRightColumn={stickyRightColumn}
    />
  )
})

const data = [
  { a: '1', b: '2', c: '3', d: '4', e: '5' },
  { a: '6', b: '7', c: '8', d: '9', e: '10' },
  { a: '11', b: '12', c: '13', d: '14', e: '15' },
]

const fiveColumns: Column[] = [
  { ...keyColumn('a', textColumn), id: 'a' },
  { ...keyColumn('b', textColumn), id: 'b' },
  { ...keyColumn('c', textColumn), id: 'c' },
  { ...keyColumn('d', textColumn), id: 'd' },
  { ...keyColumn('e', textColumn), id: 'e' },
]

const twoColumns: Column[] = [
  { ...keyColumn('a', textColumn), id: 'a' },
  { ...keyColumn('b', textColumn), id: 'b' },
]

test('activeCell.col is clamped when columns shrink', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 4, row: 1 }))
  expect(dsgRef.current.activeCell?.col).toBe(4)

  act(() => wrapperRef.current.setColumns(twoColumns))
  // maxCol = columns.length(4) - 2 = 2, so col 4 clamps to 1 (0-based user col max)
  expect(dsgRef.current.activeCell?.col).toBe(1)
  expect(dsgRef.current.activeCell?.row).toBe(1)
})

test('selectionCell is clamped when columns shrink', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() =>
    dsgRef.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 3, row: 1 },
    })
  )
  expect(dsgRef.current.selection?.max.col).toBe(3)

  act(() => wrapperRef.current.setColumns(twoColumns))
  expect(dsgRef.current.selection?.max.col).toBe(1)
})

test('activeCell unchanged when still in valid range', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 1, row: 0 }))
  act(() => wrapperRef.current.setColumns(twoColumns))
  expect(dsgRef.current.activeCell?.col).toBe(1)
  expect(dsgRef.current.activeCell?.row).toBe(0)
})

test('all data columns removed clears activeCell', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 2, row: 1 }))
  act(() => wrapperRef.current.setColumns([]))
  expect(dsgRef.current.activeCell).toBeNull()
})

test('no crash on keyboard navigation after columns shrink', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 4, row: 1 }))
  act(() => wrapperRef.current.setColumns(twoColumns))

  userEvent.keyboard('[ArrowRight]')
  expect(dsgRef.current.activeCell?.col).toBe(1)

  userEvent.keyboard('[ArrowLeft]')
  expect(dsgRef.current.activeCell?.col).toBe(0)
})

test('no crash on Delete after columns shrink', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 4, row: 1 }))
  act(() => wrapperRef.current.setColumns(twoColumns))

  expect(() => {
    userEvent.keyboard('[Delete]')
  }).not.toThrow()
})

test('stickyRightColumn computes maxCol correctly', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
      stickyRightColumn={{ component: () => <></> }}
    />
  )

  // With stickyRightColumn: columns = [gutter, a, b, c, d, e, sticky] = 7
  // maxCol = 7 - 3 = 4
  act(() => dsgRef.current.setActiveCell({ col: 4, row: 0 }))
  expect(dsgRef.current.activeCell?.col).toBe(4)

  // Shrink to 2 user cols: columns = [gutter, a, b, sticky] = 4, maxCol = 4-3 = 1
  act(() => wrapperRef.current.setColumns(twoColumns))
  expect(dsgRef.current.activeCell?.col).toBe(1)
})

test('Ctrl+A after columns shrink selects correct range', () => {
  const dsgRef = { current: null as unknown as DataSheetGridRef }
  const wrapperRef = { current: null as unknown as WrapperRef }

  render(
    <DynamicWrapper
      ref={wrapperRef}
      dsgRef={dsgRef}
      initialColumns={fiveColumns}
      data={data}
    />
  )

  act(() => dsgRef.current.setActiveCell({ col: 4, row: 1 }))
  act(() => wrapperRef.current.setColumns(twoColumns))

  userEvent.keyboard('{Meta>}a{/Meta}')
  expect(dsgRef.current.selection).toEqual({
    min: { col: 0, colId: 'a', row: 0 },
    max: { col: 1, colId: 'b', row: 2 },
  })
})
