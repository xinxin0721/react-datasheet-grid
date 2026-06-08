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
} from '../src'

jest.mock('react-resize-detector', () => ({
  useResizeDetector: () => ({ width: 100, height: 100 }),
}))

// Wrapper component that allows dynamic columns and data updates
const DynamicWrapper = ({
  columns: initialColumns,
  value: initialValue,
  onActiveCellChange,
  onSelectionChange,
  onChange,
  ref,
}: {
  columns: Column[]
  value: any[]
  onActiveCellChange?: any
  onSelectionChange?: any
  onChange?: any
  ref?: React.Ref<DataSheetGridRef>
}) => {
  const [columns, setColumns] = useState(initialColumns)
  const [value, setValue] = useState(initialValue)

  return (
    <>
      <DynamicDataSheetGrid
        value={value}
        onChange={onChange || setValue}
        columns={columns}
        onActiveCellChange={onActiveCellChange}
        onSelectionChange={onSelectionChange}
        ref={ref}
      />
      <button
        data-testid="set-columns"
        onClick={() => setColumns(initialColumns)}
      />
      <button
        data-testid="set-value"
        onClick={() => setValue(initialValue)}
      />
    </>
  )
}

// Helper: a wrapper that exposes setColumns via a ref-like pattern
const ControlledWrapper = ({
  initialColumns,
  initialValue,
  onActiveCellChange,
  onSelectionChange,
  onChange,
}: {
  initialColumns: Column[]
  initialValue: any[]
  onActiveCellChange?: any
  onSelectionChange?: any
  onChange?: any
}) => {
  const [columns, setColumns] = useState(initialColumns)
  const [value, setValue] = useState(initialValue)

  return (
    <DynamicDataSheetGrid
      value={value}
      onChange={onChange || setValue}
      columns={columns}
      onActiveCellChange={onActiveCellChange}
      onSelectionChange={onSelectionChange}
      // Expose setColumns via a data attribute trick is not ideal,
      // so we use a different approach below.
    />
  )
}

const data = [
  { firstName: 'Elon', lastName: 'Musk', email: 'elon@test.com' },
  { firstName: 'Jeff', lastName: 'Bezos', email: 'jeff@test.com' },
]

const threeColumns: Column[] = [
  keyColumn('firstName', textColumn),
  keyColumn('lastName', textColumn),
  keyColumn('email', textColumn),
]

const twoColumns: Column[] = [
  keyColumn('firstName', textColumn),
  keyColumn('lastName', textColumn),
]

// =============================================================================
// Scenario 1: Column hidden/removed — activeCell/selection no longer references old columns
// =============================================================================

test('选中列被移除后 activeCell 被 clamp', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onActiveCellChange = jest.fn()

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={threeColumns}
      ref={ref}
      onActiveCellChange={onActiveCellChange}
    />
  )

  // Select the last column (col=2, email)
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))
  expect(ref.current.activeCell).toEqual({ col: 2, colId: 'email', row: 0 })

  // Now remove the third column
  onActiveCellChange.mockClear()
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
      onActiveCellChange={onActiveCellChange}
    />
  )

  // activeCell should be clamped to col=1 (lastName, the new last column)
  expect(ref.current.activeCell).toEqual({ col: 1, colId: 'lastName', row: 0 })
})

test('选中列被移除后 selection 被 clamp', () => {
  const ref = { current: null as unknown as DataSheetGridRef }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={threeColumns}
      ref={ref}
    />
  )

  // Select from col=1 to col=2
  act(() =>
    ref.current.setSelection({
      min: { col: 1, row: 0 },
      max: { col: 2, row: 1 },
    })
  )
  expect(ref.current.selection).toEqual({
    min: { col: 1, colId: 'lastName', row: 0 },
    max: { col: 2, colId: 'email', row: 1 },
  })

  // Remove the third column
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
    />
  )

  // Selection max should be clamped to col=1
  expect(ref.current.selection).toEqual({
    min: { col: 1, colId: 'lastName', row: 0 },
    max: { col: 1, colId: 'lastName', row: 1 },
  })
})

test('所有用户列被移除后 activeCell 变为 null 或 clamp 到 0', () => {
  const ref = { current: null as unknown as DataSheetGridRef }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  expect(ref.current.activeCell).toEqual({ col: 1, colId: 'lastName', row: 0 })

  // Remove all user columns (only gutter remains)
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={[]}
      ref={ref}
    />
  )

  // With no user columns, colMax = columns.length(1) - 2 = -1, so activeCell should be null
  expect(ref.current.activeCell).toEqual(null)
})

test('移除列后键盘操作不崩溃且从正确位置开始', () => {
  const ref = { current: null as unknown as DataSheetGridRef }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={threeColumns}
      ref={ref}
    />
  )

  // Select the last column
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))

  // Remove the third column
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
    />
  )

  // Arrow right should not go beyond the new last column
  userEvent.keyboard('[ArrowRight]')
  expect(ref.current.activeCell?.col).toBeLessThanOrEqual(1)

  // Arrow left should work normally
  userEvent.keyboard('[ArrowLeft]')
  expect(ref.current.activeCell).toEqual(
    expect.objectContaining({ col: 0, colId: 'firstName', row: 0 })
  )
})

// =============================================================================
// Scenario 2: Column replaced at same position — operations use new column config
// =============================================================================

test('替换列后键盘操作使用新列', () => {
  const ref = { current: null as unknown as DataSheetGridRef }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  expect(ref.current.activeCell?.colId).toBe('lastName')

  // Replace second column with a different one
  const newColumns: Column[] = [
    keyColumn('firstName', textColumn),
    keyColumn('phone', textColumn),
  ]
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={newColumns}
      ref={ref}
    />
  )

  // Same col=1, but now colId should be 'phone'
  expect(ref.current.activeCell?.colId).toBe('phone')

  // Arrow right should stay at col=1 (last column)
  userEvent.keyboard('[ArrowRight]')
  expect(ref.current.activeCell).toEqual(
    expect.objectContaining({ col: 1, colId: 'phone', row: 0 })
  )
})

test('替换列后 delete 使用新列的 deleteValue', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  const customDeleteColumn = {
    ...keyColumn('lastName', textColumn),
    deleteValue: ({ rowData }: any) => ({ ...rowData, lastName: 'DELETED' }),
  }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={[keyColumn('firstName', textColumn), keyColumn('lastName', textColumn)]}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))

  // Replace with custom delete column
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={[keyColumn('firstName', textColumn), customDeleteColumn]}
      ref={ref}
    />
  )

  userEvent.keyboard('[Delete]')

  // The custom deleteValue should have been used
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ lastName: 'DELETED' }),
    ]),
    expect.any(Array)
  )
})

test('替换列后 onActiveCellChange 回调使用新 colId', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onActiveCellChange = jest.fn()

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={twoColumns}
      ref={ref}
      onActiveCellChange={onActiveCellChange}
    />
  )

  act(() => ref.current.setActiveCell({ col: 1, row: 0 }))
  onActiveCellChange.mockClear()

  // Replace second column
  const newColumns: Column[] = [
    keyColumn('firstName', textColumn),
    keyColumn('phone', textColumn),
  ]
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={newColumns}
      ref={ref}
      onActiveCellChange={onActiveCellChange}
    />
  )

  // The callback should fire with the new colId
  expect(onActiveCellChange).toHaveBeenCalledWith({
    cell: expect.objectContaining({ colId: 'phone', col: 1, row: 0 }),
  })
})

// =============================================================================
// Scenario 3: Column reordered — selection, copy/paste, callbacks correct
// =============================================================================

test('列重排后 selection 范围仍正确', () => {
  const ref = { current: null as unknown as DataSheetGridRef }

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={threeColumns}
      ref={ref}
    />
  )

  // Select col=0 to col=1
  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 1, row: 1 },
    })
  )
  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'firstName', row: 0 },
    max: { col: 1, colId: 'lastName', row: 1 },
  })

  // Reorder columns: [email, firstName, lastName]
  const reordered: Column[] = [
    keyColumn('email', textColumn),
    keyColumn('firstName', textColumn),
    keyColumn('lastName', textColumn),
  ]
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={reordered}
      ref={ref}
    />
  )

  // Same numeric positions, but colId should now reflect the new columns
  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'email', row: 0 },
    max: { col: 1, colId: 'firstName', row: 1 },
  })
})

test('列重排后 onSelectionChange 返回正确 colId', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onSelectionChange = jest.fn()

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={threeColumns}
      ref={ref}
      onSelectionChange={onSelectionChange}
    />
  )

  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 2, row: 0 },
    })
  )
  onSelectionChange.mockClear()

  // Reorder: [lastName, email, firstName]
  const reordered: Column[] = [
    keyColumn('lastName', textColumn),
    keyColumn('email', textColumn),
    keyColumn('firstName', textColumn),
  ]
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={() => {}}
      columns={reordered}
      ref={ref}
      onSelectionChange={onSelectionChange}
    />
  )

  // Callback should fire with new colIds for the same positions
  expect(onSelectionChange).toHaveBeenCalledWith({
    selection: {
      min: { col: 0, colId: 'lastName', row: 0 },
      max: { col: 2, colId: 'firstName', row: 0 },
    },
  })
})

test('列重排后 delete 操作对应正确的列', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={[{ firstName: 'Elon', lastName: 'Musk' }]}
      onChange={onChange}
      columns={twoColumns}
      ref={ref}
    />
  )

  act(() => ref.current.setActiveCell({ col: 0, row: 0 }))

  // Swap columns: [lastName, firstName]
  const reordered: Column[] = [
    keyColumn('lastName', textColumn),
    keyColumn('firstName', textColumn),
  ]
  rerender(
    <DynamicDataSheetGrid
      value={[{ firstName: 'Elon', lastName: 'Musk' }]}
      onChange={onChange}
      columns={reordered}
      ref={ref}
    />
  )

  // Delete at col=0 should now clear lastName (which is now at position 0)
  userEvent.keyboard('[Delete]')

  expect(onChange).toHaveBeenCalledWith(
    [{ firstName: 'Elon', lastName: null }],
    [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: 1 }]
  )
})

// =============================================================================
// Scenario 4: Normal selection behavior is not broken
// =============================================================================

test('正常行选择不受影响', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  render(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={twoColumns}
      ref={ref}
    />
  )

  // Select entire row 0
  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 1, row: 0 },
    })
  )

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'firstName', row: 0 },
    max: { col: 1, colId: 'lastName', row: 0 },
  })

  // Delete should clear both cells in row 0
  userEvent.keyboard('[Delete]')
  expect(onChange).toHaveBeenCalledWith(
    [
      { firstName: null, lastName: null, email: 'elon@test.com' },
      { firstName: 'Jeff', lastName: 'Bezos', email: 'jeff@test.com' },
    ],
    [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: 1 }]
  )
})

test('正常列选择不受影响', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  render(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={twoColumns}
      ref={ref}
    />
  )

  // Select entire column 0
  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 0, row: 1 },
    })
  )

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'firstName', row: 0 },
    max: { col: 0, colId: 'firstName', row: 1 },
  })

  // Delete should clear firstName in both rows
  userEvent.keyboard('[Delete]')
  expect(onChange).toHaveBeenCalledWith(
    [
      { firstName: null, lastName: 'Musk', email: 'elon@test.com' },
      { firstName: null, lastName: 'Bezos', email: 'jeff@test.com' },
    ],
    [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: 2 }]
  )
})

test('正常多格选择不受影响', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  render(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={threeColumns}
      ref={ref}
    />
  )

  // Select a 2x2 block
  act(() =>
    ref.current.setSelection({
      min: { col: 0, row: 0 },
      max: { col: 1, row: 1 },
    })
  )

  expect(ref.current.selection).toEqual({
    min: { col: 0, colId: 'firstName', row: 0 },
    max: { col: 1, colId: 'lastName', row: 1 },
  })

  // Delete should clear firstName and lastName in both rows
  userEvent.keyboard('[Delete]')
  expect(onChange).toHaveBeenCalledWith(
    [
      { firstName: null, lastName: null, email: 'elon@test.com' },
      { firstName: null, lastName: null, email: 'jeff@test.com' },
    ],
    [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: 2 }]
  )
})

// =============================================================================
// Edge case: add column then remove, then interact
// =============================================================================

test('添加列后移除列，delete 不崩溃', () => {
  const ref = { current: null as unknown as DataSheetGridRef }
  const onChange = jest.fn()

  const { rerender } = render(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={threeColumns}
      ref={ref}
    />
  )

  // Select last column
  act(() => ref.current.setActiveCell({ col: 2, row: 0 }))

  // Remove to two columns
  rerender(
    <DynamicDataSheetGrid
      value={data}
      onChange={onChange}
      columns={twoColumns}
      ref={ref}
    />
  )

  // Delete should not throw — it should operate on the clamped position
  expect(() => userEvent.keyboard('[Delete]')).not.toThrow()
  expect(ref.current.activeCell?.col).toBeLessThanOrEqual(1)
})
