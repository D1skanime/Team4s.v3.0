import type { Meta, StoryObj } from '@storybook/nextjs'

import { AppShellDrawerDemoSection } from './AppShellDrawerDemoSection'

/**
 * Komposition (AppShell mit
 * Slide-over-Nav-Drawer, Dual-State anonym/eingeloggt) — keine neuen Zustands-Varianten
 * gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Im Einsatz/AppShell mit Slide-over-Drawer',
  component: AppShellDrawerDemoSection,
  tags: ['autodocs'],
} satisfies Meta<typeof AppShellDrawerDemoSection>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
