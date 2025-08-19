# Arbitrage Console UI

This document provides an overview of the UI architecture and how to work with the Lovable skin.

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Skins](#skins)
  - [Classic Skin](#classic-skin)
  - [Lovable Skin](#lovable-skin)
- [Development](#development)
- [File Structure](#file-structure)
- [Theming](#theming)
- [Contributing](#contributing)

## Overview

The Arbitrage Console UI is built with React, TypeScript, and Tailwind CSS, using a skin-based architecture that allows for different visual designs while sharing the same core functionality.

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (classic skin)
npm run dev

# Start development server (lovable skin)
npm run ui:lovable

# Build for production
npm run build

# Preview production build
npm run preview
```

## Skins

The application supports multiple UI skins that can be toggled using environment variables.

### Classic Skin

The default skin with a traditional trading interface.

```bash
# Run with classic skin
npm run ui:classic
# or
NEXT_PUBLIC_FRONTEND_SKIN=classic npm run dev
```

### Lovable Skin

A modern, user-friendly interface with improved visual hierarchy and interactions.

```bash
# Run with lovable skin
npm run ui:lovable
# or
NEXT_PUBLIC_FRONTEND_SKIN=lovable npm run dev
```

## Development

### Adding a New Skin

1. Create a new directory under `src/ui/skins/` (e.g., `src/ui/skins/new-skin/`)
2. Implement the required pages and components
3. Update the skin provider to include your new skin
4. Add a new script to `package.json` for easy access

### Component Structure

Each skin should implement the following pages at minimum:

- Dashboard (`/dashboard`)
- Paper Trading (`/paper-trading`)
- Calibration (`/calibration`)

## File Structure

```
src/
  ui/
    skins/
      lovable/
        components/     # Reusable UI components
        pages/         # Page components
        hooks/         # Custom hooks
        utils/         # Utility functions
        config.ts      # Configuration
        LovableApp.tsx # Entry point
  styles/
    lovable.css        # Lovable skin styles
```

## Theming

The Lovable skin uses CSS variables for theming. The main theme colors are:

- Primary: `#6E59F9`
- Accent: `#22C55E`
- Background: Light/Dark mode supported
- Border radius: `1rem` (16px)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
