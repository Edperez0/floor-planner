# Quick Setup Guide

## Step-by-Step Instructions

### 1. Install Dependencies

Open your terminal in this directory and run:

```bash
npm install
```

This will install all required packages (React, React-Konva, Vite, etc.)

### 2. Add Your Floor Plan Image

You need to place your floor plan image in the `public` folder:

1. Create the `public` folder if it doesn't exist:
   ```bash
   mkdir -p public
   ```

2. Copy your floor plan image into `public` and name it `floorplan.png`:
   ```bash
   cp /path/to/your/floorplan-image.png public/floorplan.png
   ```

   Or simply drag and drop your floor plan image into the `public` folder and rename it to `floorplan.png`

**Supported formats:** PNG, JPG, JPEG

### 3. Start the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### 4. Calibrate the Floor Plan

**This is the most important step!**

1. Click **"Calibrate Scale"** in the top toolbar
2. Draw a line along a wall with a known dimension on your floor plan
   - Recommended: Use the M. Bedroom wall (11'5") or Living/Dining/Kitchen wall (23'4")
3. Enter the exact real-world dimension when prompted
4. Click **"Set Scale"**

### 5. Start Adding Furniture

- Use the preset buttons on the right panel for common furniture
- Or click **"+ Add Custom"** to create your own pieces
- Drag, rotate, and resize as needed!

## Troubleshooting

**Problem: Floor plan doesn't appear**
- Make sure the image is in `public/floorplan.png`
- Check the browser console for errors
- Verify the image file isn't corrupted

**Problem: npm install fails**
- Make sure you have Node.js 16+ installed
- Try deleting `node_modules` and running `npm install` again
- Try `npm cache clean --force` then `npm install`

**Problem: Furniture sizes are wrong**
- Recalibrate! Draw the line more carefully along a known dimension
- Use a horizontal or vertical wall for best accuracy
- Double-check you entered feet and inches correctly (not total inches)

## Quick Start Commands

```bash
# Install (one-time)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Next Steps

After setup, read the main [README.md](README.md) for detailed usage instructions and customization options.
