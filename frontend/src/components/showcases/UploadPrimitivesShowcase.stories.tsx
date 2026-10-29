import type { Meta, StoryObj } from '@storybook/nextjs'

import { UploadPrimitivesShowcase } from './UploadPrimitivesShowcase'

/**
 * 1:1 aus der früheren In-App-Showcase-Route migrierte Komposition
 * (UploadDropzone + UploadFileRow-Warteschlange mit lokalem Showcase-Zustand) — keine
 * neuen Zustands-Varianten gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Im Einsatz/UploadPrimitivesShowcase',
  component: UploadPrimitivesShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof UploadPrimitivesShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
