# Gallery Debug Information

## Issue Description
The page refreshes and shows the preloader when changing gallery text.

## Fixes Applied

### 1. Infinite Scroll Loop Prevention
- Added `isScrollingProgrammatically` ref flag
- Guard clauses prevent scroll handlers from triggering themselves
- 100ms initialization delay for DOM stabilization
- Passive event listeners for better performance

### 2. Animation Safety
- Try-catch blocks around scroll operations
- Proper cleanup of animation frames
- Null checks on every animation frame
- Limited to 30fps to reduce CPU usage

### 3. Intersection Observer
- Animation only runs when gallery is visible in viewport
- Stops completely when scrolled away

## How to Test

1. **Check Browser Console**: Look for any JavaScript errors
2. **Test Text Changes**: Change the gallery title/subtitle and observe
3. **Monitor Network Tab**: Check if there are failed image loads
4. **Check React DevTools**: Look for unnecessary re-renders

## Potential Causes of Page Reload

1. **Hot Module Replacement (HMR)**: If you're editing the file while the app is running, the dev server will reload the module
2. **JavaScript Errors**: Unhandled errors can cause React to crash and remount
3. **Memory Issues**: Too many operations causing browser to freeze
4. **Image Loading Errors**: Failed image loads might trigger error boundaries

## Solution

If the issue persists, try:
1. **Disable auto-scroll temporarily**: Comment out the auto-scroll useEffect
2. **Move text to constants**: Extract gallery text to a separate file so editing doesn't trigger HMR
3. **Check console**: Open browser DevTools and check for errors

## Text Configuration

To avoid HMR triggers, you can create a separate config file:

```typescript
// /config/gallery-content.ts
export const GALLERY_CONFIG = {
  title: "Examples of Laser Cutting",
  subtitle: "Explore the possibilities of laser cutting and how you can apply it to your projects"
};
```

Then import it in GallerySection.tsx instead of hardcoding the text.
