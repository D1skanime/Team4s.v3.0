import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type TableVariant = 'default' | 'compact' | 'selectable' | 'withActions'

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  caption?: ReactNode
  containerClassName?: string
  variant?: TableVariant
}

export function Table({
  caption,
  containerClassName,
  variant = 'default',
  className,
  children,
  ...props
}: TableProps) {
  return (
    <div className={classNames(styles.tableWrap, containerClassName)}>
      <table
        {...props}
        className={classNames(
          styles.table,
          variant === 'compact' && styles.tableCompact,
          variant === 'selectable' && styles.tableSelectable,
          variant === 'withActions' && styles.tableWithActions,
          className,
        )}
      >
        {caption ? <caption>{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={className} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={className} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={className} />
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={className} scope={props.scope ?? 'col'} />
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={className} />
}

export interface TableEmptyStateProps {
  colSpan: number
  title: string
  description: string
}

export function TableEmptyState({ colSpan, title, description }: TableEmptyStateProps) {
  return (
    <tr>
      <td className={styles.tableEmpty} colSpan={colSpan}>
        <strong>{title}</strong>
        <br />
        {description}
      </td>
    </tr>
  )
}
