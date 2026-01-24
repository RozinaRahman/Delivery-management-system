import * as React from 'react'
import { Table, Thead, Tbody, Tr, Th, Td, chakra, Box, Button } from '@chakra-ui/react'
import { TriangleDownIcon, TriangleUpIcon, ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import {
    useReactTable,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getExpandedRowModel,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState, ExpandedState } from '@tanstack/react-table'

export type DataTableProps<Data extends object> = {
    data: Data[]
    columns: ColumnDef<Data, any>[]
}

export function DataTable<Data extends object>({
    data,
    columns,
}: DataTableProps<Data>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [expanded, setExpanded] = React.useState<ExpandedState>({})
    
    const table = useReactTable({
        columns,
        data: data && Array.isArray(data) ? data : [],
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        state: {
            sorting,
            expanded,
        },
    })

    // Force re-render when data changes
    React.useEffect(() => {
        if (data && Array.isArray(data)) {
            table.reset()
        }
    }, [data, table])

    return (
        <Box maxH="500px" overflowY="auto">
            <Table variant="striped">
                <Thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <Tr key={headerGroup.id}>
                            <Th width="40px" pr="0"></Th>
                            {headerGroup.headers.map((header) => {
                                // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                                const meta: any = header.column.columnDef.meta
                                return (
                                    <Th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        onClick={header.column.getToggleSortingHandler()}
                                        isNumeric={meta?.isNumeric}
                                        className="cursor-pointer"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}

                                        <chakra.span pl="4">
                                            {header.column.getIsSorted() ? (
                                                header.column.getIsSorted() ===
                                                'desc' ? (
                                                    <TriangleDownIcon aria-label="sorted descending" />
                                                ) : (
                                                    <TriangleUpIcon aria-label="sorted ascending" />
                                                )
                                            ) : null}
                                        </chakra.span>
                                    </Th>
                                )
                            })}
                        </Tr>
                    ))}
                </Thead>
                <Tbody>
                    {table.getRowModel().rows.map((row) => (
                        <React.Fragment key={row.id}>
                            <Tr>
                                <Td width="40px" pr="0">
                                    {row.getCanExpand() ? (
                                        <Button
                                            {...{
                                                onClick: row.getToggleExpandedHandler(),
                                                style: {
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                },
                                            }}
                                        >
                                            {row.getIsExpanded() ? '▼' : '▶'}
                                        </Button>
                                    ) : null}
                                </Td>
                                {row.getVisibleCells().map((cell) => {
                                    // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                                    const meta: any = cell.column.columnDef.meta
                                    return (
                                        <Td
                                            key={cell.id}
                                            isNumeric={meta?.isNumeric}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </Td>
                                    )
                                })}
                            </Tr>
                            {row.getIsExpanded() && (
                                <Tr>
                                    <Td colSpan={row.getVisibleCells().length + 1}>
                                        {/* Render subRows if they exist */}
                                        {(row.original as any)?.subRows && (
                                            <Box pl="4">
                                                <Table variant="simple" size="sm">
                                                    <Tbody>
                                                        {(row.original as any).subRows.map((subRow: any) => (
                                                            <Tr key={`${row.id}-${subRow.id || subRow.firstName}`}>
                                                                <Td></Td>
                                                                {row.getVisibleCells().map((cell, index) => {
                                                                    const accessor = (cell.column.columnDef as any).accessorKey || (cell.column.columnDef as any).accessorFn
                                                                    const value = accessor ? (typeof accessor === 'function' ? accessor(subRow) : subRow[accessor]) : subRow
                                                                    return (
                                                                        <Td key={`${row.id}-${subRow.id || subRow.firstName}-${index}`}>
                                                                            {value?.toString?.() || ''}
                                                                        </Td>
                                                                    )
                                                                })}
                                                            </Tr>
                                                        ))}
                                                    </Tbody>
                                                </Table>
                                            </Box>
                                        )}
                                    </Td>
                                </Tr>
                            )}
                        </React.Fragment>
                    ))}
                </Tbody>
            </Table>
        </Box>
    )
}
