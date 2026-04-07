# Interactive Floor Planner

A React-based web application for planning furniture layouts on your floor plan. Features file upload, exact scale calibration, drag-and-drop furniture management, and browser-based persistence.

## Features

- 📤 **File Upload**: Upload any floor plan image via drag-and-drop or file picker
- 💾 **Auto-Save**: Your uploaded floor plan is automatically saved to your browser
- 🎯 **Scale Calibration**: Draw a line on a known dimension to set the exact pixels-per-inch ratio
- 🪑 **Furniture Management**: Add, resize, rotate, and move furniture with real-world dimensions
- 📏 **Exact Dimensions**: All measurements are in feet and inches, scaled precisely to your floor plan
- 🎨 **Interactive Canvas**: Built with React-Konva for smooth drag-and-drop interactions
- 🛋️ **Furniture Presets**: Quick-add common furniture items with standard dimensions

## Live Demo

Visit the live application: **https://edperez0.github.io/floor-planner/**

## Local Development

### Prerequisites
- Node.js 16+ and npm

### Setup Steps

1. **Clone or navigate to the project:**
   ```bash
   cd floor-planner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:5173`

## How to Use

### Step 1: Upload Your Floor Plan

**Option A: Drag and Drop**
- Drag any floor plan image (PNG, JPG, etc.) from your computer
- Drop it anywhere on the page

**Option B: File Picker**
- Click the **"📁 Upload Floor Plan"** button in the toolbar
- Select your floor plan image from the file browser

Your floor plan is automatically saved to your browser's localStorage and will reload on your next visit.

### Step 2: Calibrate the Scale

1. Click the **"Calibrate Scale"** button in the toolbar (only available after uploading a floor plan)
2. Click on your floor plan to **start** drawing a calibration line
3. Click again to **end** the line (draw along a wall or dimension you know)
4. Enter the **real-world length** of that line in feet and inches
   - Example: If you drew along a 10-foot wall, enter 10 feet 0 inches
5. Click **"Set Scale"**

**The Math Behind Calibration:**
```javascript
// Line length in pixels
const pixelLength = Math.sqrt((x2-x1)² + (y2-y1)²)

// Real-world length converted to inches
const totalInches = feet × 12 + inches

// Scale ratio
const pixelsPerInch = pixelLength / totalInches
```

### Step 3: Add Furniture

**Option A: Use Presets**
- Click any preset button (Queen Bed, Sofa, Dining Table, etc.)
- The furniture appears at the center of the canvas with standard dimensions

**Option B: Custom Furniture**
- Click **"+ Add Custom"**
- Enter furniture name and dimensions (feet + inches)
- Click **"Add to Canvas"**

### Step 4: Arrange Furniture

- **Select**: Click any furniture piece to select it
- **Drag**: Click and drag to move furniture around
- **Rotate**: When selected, drag the circular rotation handle at the top
- **Resize**: When selected, drag corner handles to resize proportionally
- **Edit Dimensions**: Select furniture to edit exact dimensions in the right panel
- **Delete**: Select furniture and click "Delete" button in the right panel

### Step 5: Change Floor Plan

To upload a different floor plan:
- Click **"📁 Change Floor Plan"** in the toolbar
- Upload your new floor plan
- Recalibrate the scale for the new image

## Code Structure

```
floor-planner/
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions deployment
├── public/
│   └── floorplan.png          # Sample floor plan image
├── src/
│   ├── components/
│   │   ├── Toolbar.jsx        # Top navigation bar with upload button
│   │   ├── FurniturePanel.jsx # Right sidebar with presets
│   │   ├── FurnitureItem.jsx  # Individual furniture renderer
│   │   ├── CalibrationLine.jsx # Visual calibration line
│   │   └── CalibrationModal.jsx # Scale input modal
│   ├── hooks/
│   │   └── useImage.js        # Image loading hook
│   ├── App.jsx                # Main application logic with file upload
│   ├── App.css                # Styling with drag-drop overlay
│   ├── index.css
│   └── main.jsx
├── package.json
├── vite.config.js             # Configured for GitHub Pages
└── index.html
```

## Key Formulas

### Scale Conversion
```javascript
// Real-world to canvas
canvasPixels = realInches × pixelsPerInch

// Canvas to real-world
realInches = canvasPixels / pixelsPerInch
```

### Furniture Sizing
```javascript
// Width in inches
totalWidthInches = widthFeet × 12 + widthInches

// Canvas width
canvasWidth = totalWidthInches × pixelsPerInch
```

## Data Persistence

### Floor Plan Storage

Uploaded floor plans are automatically stored in your browser's localStorage:

```javascript
// Auto-save on upload
localStorage.setItem('floorPlanImage', dataUrl);

// Auto-load on mount
const savedFloorPlan = localStorage.getItem('floorPlanImage');
if (savedFloorPlan) setFloorPlanUrl(savedFloorPlan);
```

**Note**: localStorage is device and browser-specific. If you access the app from a different device or browser, you'll need to re-upload your floor plan.

### Extending with Furniture Persistence

To save furniture layouts (not yet implemented), add to `App.jsx`:

```javascript
// Save furniture to localStorage
useEffect(() => {
  localStorage.setItem('furniture', JSON.stringify(furniture));
  localStorage.setItem('pixelsPerInch', pixelsPerInch);
}, [furniture, pixelsPerInch]);

// Load on mount
useEffect(() => {
  const savedFurniture = localStorage.getItem('furniture');
  const savedScale = localStorage.getItem('pixelsPerInch');
  if (savedFurniture) setFurniture(JSON.parse(savedFurniture));
  if (savedScale) setPixelsPerInch(parseFloat(savedScale));
}, []);
```

### Export Layout as JSON

```javascript
const exportLayout = () => {
  const data = {
    furniture,
    pixelsPerInch,
    timestamp: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'floor-plan-layout.json';
  a.click();
};
```

## Troubleshooting

### Floor plan not uploading
- Ensure you're uploading an image file (PNG, JPG, JPEG, GIF, etc.)
- Check browser console for errors
- Try a smaller image if the file is very large

### Floor plan disappeared on reload
- Check if you're using the same browser and device (localStorage is local)
- Verify you haven't cleared your browser cache/data
- Re-upload the floor plan if needed

### Can't calibrate
- Make sure you've uploaded a floor plan first
- The "Calibrate Scale" button is disabled until a floor plan is loaded

### Furniture appears too large/small
- Recalibrate the scale with a more accurate dimension
- Verify you're entering feet and inches correctly (not just inches)
- Use a longer calibration line for better accuracy

### Can't select/drag furniture
- Make sure calibration is complete first
- Check that furniture is actually added (appears in the furniture panel)
- Try clicking directly on the furniture rectangle

## Dependencies

- **React 18**: UI framework
- **React-Konva**: Canvas rendering and interactions
- **Konva**: HTML5 Canvas JavaScript library
- **Vite**: Build tool and dev server

## Deployment

### GitHub Pages (Automatic)

This project is configured for automatic deployment to GitHub Pages via GitHub Actions:

1. Push to the `main` branch
2. GitHub Actions automatically builds and deploys
3. Live site available at: `https://yourusername.github.io/floor-planner/`

The deployment workflow is in `.github/workflows/deploy.yml`

### Manual Build

```bash
npm run build
```

Output will be in the `dist` folder. Deploy to any static hosting service:
- **Netlify**: Drag `dist` folder to [drop.netlify.com](https://drop.netlify.com)
- **Vercel**: Run `vercel` CLI or connect GitHub repo
- **Surge**: Run `surge dist`
- **Any static host**: Upload contents of `dist` folder

## License

MIT

## Support

For issues or questions, refer to:
- [React-Konva Docs](https://konvajs.org/docs/react/)
- [Konva API](https://konvajs.org/api/Konva.html)
