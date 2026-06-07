import React, { useState } from 'react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { render, act } from '@testing-library/react'
import {
  DynamicDataSheetGrid,
  Column,
  textColumn,
  keyColumn,
  DataSheetGridRef,
  checkboxColumn,
} from '../src'

jest.mock('react-resize-detector', () => ({
  useResizeDetector: () => ({ width: 100, height: 100 }),
}))

const data = [
  { active: false, firstName: 'Elon', lastName: 'Musk' },
  { active: true, firstName: 'Jeff', lastName: 'Bezos' },
  { active: false, firstName: 'Richard', lastName: 'Branson' },
]

const threeColumns: Column[] = [
  keyColumn('active', checkboxColumn),
  keyColumn('firstName', textColumn),
  keyColumn('lastName', textColumn),
]

const twoColumns: Column[] = [
  keyColumn('firstName', textColumn),
  keyColumn('lastName', textColumn),
]

const oneColumn: Column[] = [keyColumn('firstName', textColumn)]

const DynamicWrapper = ({
  initialColumns,
  dsgRef,
  onActiveCellChange,
  onSelectionChange,
}: {
  initialColumns: Column[]
  dsgRef: { current: DataSheetGridRef }
  onActiveCellChange?: jest.Mock
  onSelectionChange?: jest.Mock
}) => {
  const [columns, setColumns] = useState(initialColumns)
  const [value, setValue] = useState(data)

  return (
    <DynamicDataSheetGrid
      value={value}
      onChange={setValue}
      columns={columns}
      ref={dsgRef}
      onActiveCellChange={onActiveCellChange}
      onSelectionChange={onSelectionChange}
      // Expose setColumns for test usage via a data attribute hack
      {...({ 'data-set-columns': setColumns } as any)}
    />
  )
}

// Helper to get the setColumns function from the rendered component
// We use a wrapper that exposes setColumns via a ref-like pattern
const DynamicWrapperWithColumnSetter = ({
  initialColumns,
  dsgRef,
  columnsRef,
  onActiveCellChange,
  onSelectionChange,
}: {
  initialColumns: Column[]
  dsgRef: { current: DataSheetGridRef }
  columnsRef: { current: (cols: Column[]) => void }
  onActiveCellChange?: jest.Mock
  onSelectionChange?: jest.Mock
}) => {
  const [columns, setColumns] = useState(initialColumns)
  const [value, setValue] = useState(data)

  columnsRef.current = setColumns

  return (
    <DynamicDataSheetGrid
      value={value}
      onChange={setValue}
      columns={columns}
      ref={dsgRef}
      onActiveCellChange={onActiveCellChange}
      onSelectionChange={onSelectionChange}
    />
  )
}

test('activeCell is clamped when columns are reduced', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  // Set active cell to the last column (col 2)
  act(() => ref.current.setActiveCell({ col: 2, row: 1 }))
  expect(ref.current.activeCell).toEqual({
    col: 2,
    colId: 'lastName',
    row: 1,
  })

  // Reduce columns from 3 to 1
  act(() => columnsRef.current(oneColumn))

  // activeCell.col should be clamped to 0
  expect(ref.current.activeCell).toEqual({
    col: 0,
    colId: 'firstName',
    row: 1,
  })
})

test('selection is clamped when columns are reduced', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  // Set selection spanning all 3 columns
  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 2, row: 2 },
    })
  )
  expect(ref.current.selection?.max.col).toBe(2)

  // Reduce columns from 3 to 2
  act(() => columnsRef.current(twoColumns))

  // selection max.col should be clamped to 1
  expect(ref.current.selection?.max.col).toBe(1)
  expect(ref.current.selection?.max.colId).toBe('lastName')
})

test('activeCell is cleared when all columns are removed', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  expect(ref.current.activeCell).not.toBeNull()

  // Remove all columns
  act(() => columnsRef.current([]))

  expect(ref.current.activeCell).toBeNull()
})

test('selection is cleared when all columns are removed', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 2, row: 2 },
    })
  )
  expect(ref.current.selection).not.toBeNull()

  // Remove all columns
  act(() => columnsRef.current([]))

  expect(ref.current.activeCell).toBeNull()
})

test('activeCell stays valid when columns increase', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={oneColumn}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 1 }))
  expect(ref.current.activeCell).toEqual({
    col: 0,
    colId: 'firstName',
    row: 1,
  })

  // Add more columns
  act(() => columnsRef.current(threeColumns))

  // activeCell should remain at the same position
  expect(ref.current.activeCell).toEqual({
    col: 0,
    colId: 'active',
    row: 1,
  })
})

test('keyboard navigation works correctly after column reduction', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  // Set active cell to the last column (col 2)
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))

  // Reduce columns from 3 to 1
  act(() => columnsRef.current(oneColumn))

  // activeCell should be clamped to col 0
  expect(ref.current.activeCell?.col).toBe(0)

  // Arrow right should not go beyond col 0 (only 1 column)
  userEvent.keyboard('[ArrowRight]')
  expect(ref.current.activeCell?.col).toBe(0)

  // Arrow down should still work for rows
  userEvent.keyboard('[ArrowDown]')
  expect(ref.current.activeCell).toEqual({
    col: 0,
    colId: 'firstName',
    row: 1,
  })
})

test('delete works correctly after column reduction', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }
  const onChange = jest.fn()

  const WrapperWithOnChange = () => {
    const [columns, setColumns] = useState(threeColumns)
    const [value, setValue] = useState(data)
    const wrappedOnChange = (newData: any[], op: any) => {
      setValue(newData)
      onChange(newData, op)
    }
    columnsRef.current = setColumns

    return (
      <DynamicDataSheetGrid
        value={value}
        onChange={wrappedOnChange}
        columns={columns}
        ref={ref}
      />
    )
  }

  render(<WrapperWithOnChange />)

  // Set active cell to last column
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))

  // Reduce to 1 column
  act(() => columnsRef.current(oneColumn))

  // activeCell should be clamped to col 0
  expect(ref.current.activeCell?.col).toBe(0)

  // Delete should clear the firstName cell, not crash
  onChange.mockClear()
  userEvent.keyboard('[Backspace]')

  expect(onChange).toHaveBeenCalled()
  const [newData] = onChange.mock.calls[0]
  expect(newData[0].firstName).toBeNull()
})

test('onActiveCellChange callback reports correct colId after column change', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }
  const onActiveCellChange = jest.fn()

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
      onActiveCellChange={onActiveCellChange}
    />
  )

  // Set active cell to last column
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))

  // Clear the callback history
  onActiveCellChange.mockClear()

  // Reduce columns - this should trigger onActiveCellChange with clamped cell
  act(() => columnsRef.current(oneColumn))

  // The callback should have been called with the clamped cell
  expect(onActiveCellChange).toHaveBeenCalled()
  const lastCall =
    onActiveCellChange.mock.calls[onActiveCellChange.mock.calls.length - 1][0]
  expect(lastCall.cell.col).toBe(0)
  expect(lastCall.cell.colId).toBe('firstName')
  expect(lastCall.cell.row).toBe(0)
})

test('activeCell at boundary is not changed when columns are sufficient', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const columnsRef = { current: null as unknown as (cols: Column[]) => void }

  render(
    <DynamicWrapperWithColumnSetter
      initialColumns={threeColumns}
      dsgRef={ref}
      columnsRef={columnsRef}
    />
  )

  // Set active cell to col 1
  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))

  // Reduce to 2 columns (col 1 is still valid)
  act(() => columnsRef.current(twoColumns))

  // activeCell should remain at col 1
  expect(ref.current.activeCell).toEqual({
    col: 1,
    colId: 'lastName',
    row: 0,
  })
})
