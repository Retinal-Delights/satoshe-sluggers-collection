# Satoshe Sluggers NFT Marketplace - Implementation Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Environment Variables
```bash
# Create .env.local
THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
```

### 3. Run Development Server
```bash
pnpm dev
```

## 🎨 Design System Implementation

### Color System
The marketplace uses a consistent color palette defined in `tailwind.config.ts`:

```typescript
colors: {
  brand: {
    pink: "#FF0099",        // Primary brand color
    "pink-hover": "#E6008A", // Hover state
  },
  neutral: {
    50: "#fafafa",   // Lightest
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",  // Secondary text
    500: "#737373",  // Tertiary text
    600: "#525252",
    700: "#404040",  // Borders
    800: "#262626",  // Card backgrounds
    900: "#171717",  // Input backgrounds
    950: "#0a0a0a",  // Main background
  }
}
```

### Typography System
Use semantic HTML with consistent Tailwind classes:

```tsx
// Headings
<h1 className="text-3xl sm:text-4xl font-semibold">Page Title</h1>
<h2 className="text-2xl sm:text-3xl font-medium">Section Title</h2>
<h3 className="text-xl sm:text-2xl font-medium">Subsection Title</h3>

// Body Text
<p className="text-base">Default text</p>
<p className="text-sm text-neutral-400">Secondary text</p>
<p className="text-xs text-neutral-500">Caption text</p>
```

### Component Patterns

#### Buttons
```tsx
// Primary Button
<button className="bg-[#FF0099] hover:bg-[#E6008A] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
  Click Me
</button>

// Secondary Button
<button className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
  Secondary
</button>

// Ghost Button
<button className="text-neutral-400 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
  Ghost
</button>
```

#### Cards
```tsx
// NFT Card
<div className="bg-neutral-800 border border-neutral-700 rounded-md p-4 hover:bg-neutral-700 transition-colors duration-200">
  <img src={image} alt={name} className="w-full h-48 object-cover rounded-md mb-4" />
  <h3 className="text-lg font-medium text-white mb-2">{name}</h3>
  <p className="text-sm text-neutral-400">{description}</p>
</div>

// Content Card
<div className="bg-neutral-800 border border-neutral-700 rounded-md p-6">
  <h2 className="text-xl font-medium text-white mb-4">Card Title</h2>
  <p className="text-neutral-400">Card content</p>
</div>
```

#### Inputs
```tsx
// Text Input
<input 
  className="bg-neutral-900 border border-neutral-600 text-white placeholder-neutral-400 focus:border-[#FF0099] focus:ring-0 px-3 py-2 rounded-md text-sm w-full"
  placeholder="Enter text..."
/>

// Search Input
<input 
  className="bg-neutral-900 border border-neutral-600 text-[#FF0099] placeholder-neutral-400 focus:border-[#FF0099] focus:ring-0 px-3 py-2 rounded-md text-sm w-full"
  placeholder="Search..."
/>
```

#### Navigation
```tsx
// Active Tab
<button className="border-b-2 border-[#FF0099] text-white font-medium px-4 py-2">
  Active Tab
</button>

// Inactive Tab
<button className="text-neutral-400 hover:text-white px-4 py-2 transition-colors duration-200">
  Inactive Tab
</button>
```

## 🏗️ Architecture

### File Structure
```
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── nfts/              # NFT listing page
│   ├── nft/[id]/          # NFT detail pages
│   ├── my-nfts/           # User's NFTs
│   ├── sell/              # Sell NFT page
│   ├── about/             # About page
│   └── contact/           # Contact page
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── nft-card.tsx      # NFT card component
│   ├── nft-grid.tsx      # NFT grid component
│   ├── navigation.tsx     # Main navigation
│   └── header-80.tsx     # Header component
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── public/               # Static assets
```

### Key Components

#### NFT Grid (`components/nft-grid.tsx`)
- Displays NFTs in a responsive grid
- Handles filtering, sorting, and pagination
- Manages auction data and user interactions

#### NFT Card (`components/nft-card.tsx`)
- Individual NFT display component
- Handles bidding and buying functionality
- Shows NFT metadata and auction information

#### Navigation (`components/navigation.tsx`)
- Main site navigation
- Responsive design with mobile menu
- Active state management

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow React best practices
- Use Tailwind CSS for styling
- Implement proper error handling

### Component Guidelines
- Use semantic HTML elements
- Implement proper accessibility
- Follow the design system
- Use consistent naming conventions

### State Management
- Use React hooks for local state
- Use Context for global state
- Implement proper loading states
- Handle errors gracefully

## 🎯 Best Practices

### Performance
- Use Next.js Image component for images
- Implement proper loading states
- Optimize bundle size
- Use React.memo for expensive components

### Accessibility
- Use semantic HTML elements
- Implement proper focus management
- Ensure color contrast ratios
- Add proper ARIA labels

### SEO
- Use proper meta tags
- Implement structured data
- Optimize page titles
- Use proper heading hierarchy

## 🚨 Common Issues & Solutions

### Styling Issues
```tsx
// ❌ Don't use arbitrary values
<div className="p-3 text-lg bg-red-500">

// ✅ Use design system values
<div className="p-4 text-base bg-[#FF0099]">
```

### Color Issues
```tsx
// ❌ Don't use arbitrary colors
<div className="text-gray-400 bg-blue-500">

// ✅ Use defined color palette
<div className="text-neutral-400 bg-[#FF0099]">
```

### Spacing Issues
```tsx
// ❌ Don't use arbitrary spacing
<div className="p-3 m-5 gap-7">

// ✅ Use spacing scale
<div className="p-4 m-4 gap-4">
```

### Typography Issues
```tsx
// ❌ Don't use arbitrary sizes
<div className="text-2xl font-bold">

// ✅ Use typography scale
<h2 className="text-2xl sm:text-3xl font-medium">
```

## 🔍 Testing

### Component Testing
- Test component rendering
- Test user interactions
- Test responsive behavior
- Test accessibility

### Integration Testing
- Test data flow
- Test API integrations
- Test user workflows
- Test error handling

## 📱 Responsive Design

### Breakpoints
- **xs**: 475px - Extra small devices
- **sm**: 640px - Small devices
- **md**: 768px - Medium devices
- **lg**: 1024px - Large devices
- **xl**: 1280px - Extra large devices

### Grid System
```tsx
// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
  {nfts.map(nft => <NFTCard key={nft.id} {...nft} />)}
</div>
```

## 🚀 Deployment

### Build Process
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables
```bash
# Required environment variables
THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
```

### Performance Optimization
- Enable Next.js Image Optimization
- Use proper caching strategies
- Optimize bundle size
- Implement proper error boundaries

This implementation guide provides everything needed to maintain and extend the Satoshe Sluggers NFT Marketplace with consistency and best practices.
