# Interactive Floor Planner

A React-based web application for planning furniture layouts on your floor plan. Features exact scale calibration, drag-and-drop furniture management, and file upload support.

## Features

- 🎯 **Scale Calibration**: Draw a line on a known dimension to set the exact pixels-per-inch ratio
- 🪑 **Furniture Management**: Add, resize, rotate, and move furniture with real-world dimensions
- 📏 **Exact Dimensions**: All measurements are in feet and inches, scaled precisely to your floor plan
- 🎨 **Interactive Canvas**: Built with React-Konva for smooth drag-and-drop interactions
- 💾 **Furniture Presets**: Quick-add common furniture items with standard dimensions

## Installation

### Prerequisites
- Node.js 16+ and npm

### Setup Steps

1. **Navigate to the project directory:**
   ```bash
   cd /Users/perez.eduardo/Claude_Generated_Files/floor-planner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add your floor plan image:**
   - Place your floor plan image in the `public` folder
   - Name it `floorplan.png` (or update the path in `src/App.jsx` line 13)

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:5173`

## How to Use

### Step 1: Calibrate the Scale

1. Click the **"Calibrate Scale"** button in the toolbar
2. Click on your floor plan to **start** drawing a calibration line
3. Click again to **end** the line (ideally along a wall or dimension you know)
4. Enter the **real-world length** of that line in feet and inches
   - Example: If you drew along the M. Bedroom wall, enter 11 feet 5 inches
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

### Step 2: Add Furniture

**Option A: Use Presets**
- Click any preset button (Queen Bed, Sofa, etc.)
- The furniture appears at the center of the canvas

**Option B: Custom Furniture**
- Click **"+ Add Custom"**
- Enter name and dimensions (feet + inches)
- Click **"Add to Canvas"**

### Step 3: Arrange Furniture

- **Drag**: Click and drag any furniture piece
- **Rotate**: Select furniture, then drag the rotation handle (circle at top)
- **Resize**: Select furniture, drag corner handles to resize
- **Edit**: Select furniture to edit its exact dimensions in the right panel

### Step 4: Save Your Layout

Currently, furniture state is maintained in the session. To save permanently:
- Add localStorage persistence (code provided below)
- Or export to JSON

## Room Dimensions from Your Floor Plan

- Living/Dining/Kitchen: **23'4" × 29'3"**
- M. Bedroom: **11'5" × 12'0"**
- Bedroom: **12'5" × 12'6"**

Use these dimensions for calibration!

## Code Structure

```
floor-planner/
├── public/
│   └── floorplan.png          # Your floor plan image
├── src/
│   ├── components/
│   │   ├── Toolbar.jsx        # Top navigation bar
│   │   ├── FurniturePanel.jsx # Right sidebar with presets
│   │   ├── FurnitureItem.jsx  # Individual furniture renderer
│   │   ├── CalibrationLine.jsx # Visual calibration line
│   │   └── CalibrationModal.jsx # Scale input modal
│   ├── hooks/
│   │   └── useImage.js        # Image loading hook
│   ├── App.jsx                # Main application logic
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── package.json
├── vite.config.js
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

## Extending the Application

### Add localStorage Persistence

Add to `App.jsx`:

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

### Floor plan image not showing
- Ensure the image is in the `public` folder
- Check the file name matches the path in `App.jsx`
- Try using an absolute path: `/floorplan.png`

### Furniture appears too large/small
- Recalibrate the scale with a more accurate dimension
- Verify you're entering feet and inches correctly (not just inches)

### Can't select/drag furniture
- Make sure calibration is complete first
- Check that furniture is actually added (appears in the selected panel)

## Dependencies

- **React 18**: UI framework
- **React-Konva**: Canvas rendering and interactions
- **Konva**: HTML5 Canvas JavaScript library
- **Vite**: Build tool and dev server

## Building for Production

```bash
npm run build
```

Output will be in the `dist` folder. Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## License

MIT

## Support

For issues or questions, refer to:
- [React-Konva Docs](https://konvajs.org/docs/react/)
- [Konva API](https://konvajs.org/api/Konva.html)
