/**
 * DXF Parser Utility
 * 
 * Parses AutoCAD DXF (Drawing Exchange Format) files to extract:
 * - Cutting dimensions (width × height in mm)
 * - Total cutting path length (for pricing calculations)
 * - Geometric entities (lines, circles, arcs, polylines)
 * - Bounding box coordinates
 * 
 * DXF Format Overview:
 * - Text-based CAD file format using group codes
 * - Group codes are paired values: code (what) + value (data)
 * - Common group codes:
 *   0  = Entity type marker (LINE, CIRCLE, ARC, etc.)
 *   10 = Primary X coordinate
 *   20 = Primary Y coordinate
 *   11 = Secondary X coordinate (e.g., line end point)
 *   21 = Secondary Y coordinate
 *   40 = Radius (for circles/arcs)
 *   50 = Start angle (degrees, for arcs)
 *   51 = End angle (degrees, for arcs)
 * 
 * @module dxf-parser
 */

/**
 * Parsed DXF data structure containing dimensions and entities
 */
export interface DXFData {
  width: number;          // Bounding box width in mm
  height: number;         // Bounding box height in mm
  cuttingLength: number;  // Total cutting path length in mm (for pricing)
  entities: any[];        // Array of geometric entities (lines, circles, arcs, polylines)
  minX: number;           // Minimum X coordinate (left edge)
  minY: number;           // Minimum Y coordinate (bottom edge)
  maxX: number;           // Maximum X coordinate (right edge)
  maxY: number;           // Maximum Y coordinate (top edge)
}

/**
 * Parse DXF file content and extract dimensions, cutting length, and entities
 * 
 * Algorithm:
 * 1. Parse HEADER section for drawing extents ($EXTMIN, $EXTMAX)
 * 2. Parse ENTITIES section for all geometric shapes
 * 3. Calculate cutting length based on entity types:
 *    - LINE: Euclidean distance
 *    - CIRCLE: Full circumference (2πr)
 *    - ARC: Partial circumference based on angle
 *    - LWPOLYLINE: Sum of segments (handles bulges for arcs)
 * 4. Track bounding box coordinates (min/max X/Y)
 * 5. Use header extents as fallback if more accurate than calculated bounds
 * 
 * @param content - Raw DXF file content as string
 * @returns Parsed DXF data with dimensions and entities
 * 
 * @example
 * const dxfContent = await file.text();
 * const data = parseDXF(dxfContent);
 * console.log(`Size: ${data.width}mm × ${data.height}mm`);
 * console.log(`Cutting length: ${data.cuttingLength}mm`);
 */
export function parseDXF(content: string): DXFData {
  // Split DXF content into lines and remove whitespace
  const lines = content.split('\n').map(l => l.trim());
  
  // Initialize bounding box tracking with sentinel values
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let totalLength = 0; // Accumulator for total cutting path length
  const entities = [];
  
  // ============================================================================
  // STEP 1: Parse HEADER section for drawing extents
  // ============================================================================
  // DXF HEADER contains metadata including $EXTMIN/$EXTMAX (bounding box)
  // These are often more accurate than calculated bounds from entities
  
  let headerMinX: number | null = null;
  let headerMinY: number | null = null;
  let headerMaxX: number | null = null;
  let headerMaxY: number | null = null;
  
  let inHeaderSection = false;
  for (let i = 0; i < lines.length; i++) {
    // HEADER section starts with "HEADER" marker
    if (lines[i] === 'HEADER') {
      inHeaderSection = true;
      continue;
    }
    // ENDSEC marks end of any section
    if (lines[i] === 'ENDSEC' && inHeaderSection) {
      inHeaderSection = false;
      break; // Header is always first, so we can stop
    }
    
    if (inHeaderSection) {
      // $EXTMIN = Minimum extents (bottom-left corner)
      if (lines[i] === '$EXTMIN') {
        // Group codes follow: 10=X, 20=Y, 30=Z (we ignore Z)
        // Read up to 10 lines or until next variable (code 9) or entity (code 0)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j += 2) {
          if (lines[j] === '10') headerMinX = parseFloat(lines[j + 1]);
          if (lines[j] === '20') headerMinY = parseFloat(lines[j + 1]);
          if (lines[j] === '9' || lines[j] === '0') break; // Next variable or section
        }
      }
      // $EXTMAX = Maximum extents (top-right corner)
      if (lines[i] === '$EXTMAX') {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j += 2) {
          if (lines[j] === '10') headerMaxX = parseFloat(lines[j + 1]);
          if (lines[j] === '20') headerMaxY = parseFloat(lines[j + 1]);
          if (lines[j] === '9' || lines[j] === '0') break;
        }
      }
    }
  }
  
  // ============================================================================
  // STEP 2: Parse ENTITIES section for geometric shapes
  // ============================================================================
  // ENTITIES section contains all drawable objects (lines, circles, arcs, etc.)
  
  let inEntitiesSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // ENTITIES section starts with "ENTITIES" marker
    if (line === 'ENTITIES') {
      inEntitiesSection = true;
      continue;
    }
    
    // ENDSEC marks end of ENTITIES section
    if (line === 'ENDSEC' && inEntitiesSection) {
      inEntitiesSection = false;
      continue;
    }
    
    // Only process lines within ENTITIES section
    if (!inEntitiesSection) continue;
    
    // Group code "0" marks start of new entity, followed by entity type
    if (line === '0' && i + 1 < lines.length) {
      const entityType = lines[i + 1];
      
      // ========================================================================
      // Parse LINE entities (straight line segments)
      // ========================================================================
      // LINE format:
      //   0      (entity marker)
      //   LINE   (entity type)
      //   10     (start X)
      //   <value>
      //   20     (start Y)
      //   <value>
      //   11     (end X)
      //   <value>
      //   21     (end Y)
      //   <value>
      
      if (entityType === 'LINE') {
        const lineData: any = { type: 'LINE' };
        
        // Read next ~25 pairs (50 lines) to get all LINE properties
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break; // Next entity started
          if (code === '10') lineData.x1 = parseFloat(value); // Start X
          if (code === '20') lineData.y1 = parseFloat(value); // Start Y
          if (code === '11') lineData.x2 = parseFloat(value); // End X
          if (code === '21') lineData.y2 = parseFloat(value); // End Y
        }
        
        // Validate that we have all required coordinates
        if (lineData.x1 !== undefined && lineData.y1 !== undefined && 
            lineData.x2 !== undefined && lineData.y2 !== undefined) {
          
          // Calculate Euclidean distance for cutting length
          const length = Math.sqrt(
            Math.pow(lineData.x2 - lineData.x1, 2) + 
            Math.pow(lineData.y2 - lineData.y1, 2)
          );
          totalLength += length;
          
          // Update bounding box with both endpoints
          minX = Math.min(minX, lineData.x1, lineData.x2);
          minY = Math.min(minY, lineData.y1, lineData.y2);
          maxX = Math.max(maxX, lineData.x1, lineData.x2);
          maxY = Math.max(maxY, lineData.y1, lineData.y2);
          
          entities.push(lineData);
        }
      }
      
      // ========================================================================
      // Parse CIRCLE entities (complete circles)
      // ========================================================================
      // CIRCLE format:
      //   0      (entity marker)
      //   CIRCLE (entity type)
      //   10     (center X)
      //   <value>
      //   20     (center Y)
      //   <value>
      //   40     (radius)
      //   <value>
      
      if (entityType === 'CIRCLE') {
        const circleData: any = { type: 'CIRCLE' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') circleData.x = parseFloat(value);      // Center X
          if (code === '20') circleData.y = parseFloat(value);      // Center Y
          if (code === '40') circleData.radius = parseFloat(value); // Radius
        }
        
        if (circleData.x !== undefined && circleData.y !== undefined && circleData.radius !== undefined) {
          // Calculate full circumference (2πr) for cutting length
          const circumference = 2 * Math.PI * circleData.radius;
          totalLength += circumference;
          
          // Update bounding box (circle extends radius in all directions)
          minX = Math.min(minX, circleData.x - circleData.radius);
          minY = Math.min(minY, circleData.y - circleData.radius);
          maxX = Math.max(maxX, circleData.x + circleData.radius);
          maxY = Math.max(maxY, circleData.y + circleData.radius);
          
          entities.push(circleData);
        }
      }
      
      // ========================================================================
      // Parse ARC entities (partial circles)
      // ========================================================================
      // ARC format:
      //   0      (entity marker)
      //   ARC    (entity type)
      //   10     (center X)
      //   <value>
      //   20     (center Y)
      //   <value>
      //   40     (radius)
      //   <value>
      //   50     (start angle in degrees, counter-clockwise from X-axis)
      //   <value>
      //   51     (end angle in degrees)
      //   <value>
      
      if (entityType === 'ARC') {
        const arcData: any = { type: 'ARC' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') arcData.x = parseFloat(value);           // Center X
          if (code === '20') arcData.y = parseFloat(value);           // Center Y
          if (code === '40') arcData.radius = parseFloat(value);      // Radius
          if (code === '50') arcData.startAngle = parseFloat(value);  // Start angle (degrees)
          if (code === '51') arcData.endAngle = parseFloat(value);    // End angle (degrees)
        }
        
        if (arcData.x !== undefined && arcData.y !== undefined && 
            arcData.radius !== undefined && arcData.startAngle !== undefined && 
            arcData.endAngle !== undefined) {
          
          // Calculate angle span (handle negative angles by adding 360°)
          let angleDiff = arcData.endAngle - arcData.startAngle;
          if (angleDiff < 0) angleDiff += 360;
          
          // Calculate arc length: (angle/360°) × circumference
          const arcLength = (angleDiff / 360) * 2 * Math.PI * arcData.radius;
          totalLength += arcLength;
          
          // Update bounding box (use full circle bounds as approximation)
          // TODO: Calculate exact arc bounds using start/end points
          minX = Math.min(minX, arcData.x - arcData.radius);
          minY = Math.min(minY, arcData.y - arcData.radius);
          maxX = Math.max(maxX, arcData.x + arcData.radius);
          maxY = Math.max(maxY, arcData.y + arcData.radius);
          
          entities.push(arcData);
        }
      }
      
      // ========================================================================
      // Parse LWPOLYLINE entities (lightweight polylines)
      // ========================================================================
      // LWPOLYLINE is a sequence of vertices that can be straight lines or arcs
      // "Bulge factor" determines if segment is line (bulge=0) or arc (bulge≠0)
      // 
      // Bulge calculation:
      //   bulge = tan(θ/4), where θ is the included angle of the arc
      //   Positive bulge = counter-clockwise arc
      //   Negative bulge = clockwise arc
      //   Zero bulge = straight line
      // 
      // LWPOLYLINE format:
      //   0         (entity marker)
      //   LWPOLYLINE (entity type)
      //   10        (vertex X) ← repeats for each vertex
      //   <value>
      //   20        (vertex Y)
      //   <value>
      //   42        (bulge factor) ← optional, applies to segment FROM this vertex
      //   <value>
      //   ... (more vertices)
      
      if (entityType === 'LWPOLYLINE') {
        const polyData: any = { type: 'LWPOLYLINE', vertices: [], closed: false };
        
        // LWPOLYLINE can have many vertices, so we use dynamic loop
        let j = i + 2;
        let currentVertex: any = null;

        while (j < lines.length) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break; // Next entity started, end of polyline
          
          // Group code 70 = polyline flag (bit 0 = closed)
          if (code === '70') {
            const flags = parseInt(value);
            polyData.closed = (flags & 1) === 1; // Bit 0 indicates closed polyline
          } else if (code === '10') {
            // New vertex starts (group code 10 = X coordinate)
            if (currentVertex) polyData.vertices.push(currentVertex);
            currentVertex = { x: parseFloat(value), bulge: 0 }; // Default bulge=0 (straight line)
          } else if (code === '20') {
            // Y coordinate for current vertex
            if (currentVertex) currentVertex.y = parseFloat(value);
          } else if (code === '42') {
            // Bulge factor (determines arc vs line for segment FROM this vertex)
            if (currentVertex) currentVertex.bulge = parseFloat(value);
          }
          
          j += 2; // DXF is always code-value pairs
        }
        
        // Push the last vertex
        if (currentVertex) polyData.vertices.push(currentVertex);
        
        // ======================================================================
        // Calculate total length from all polyline segments
        // ======================================================================
        for (let k = 0; k < polyData.vertices.length - 1; k++) {
          const v1 = polyData.vertices[k];
          const v2 = polyData.vertices[k + 1];
          
          // Calculate chord length (straight-line distance between vertices)
          const chordLength = Math.sqrt(
            Math.pow(v2.x - v1.x, 2) + 
            Math.pow(v2.y - v1.y, 2)
          );

          if (v1.bulge && v1.bulge !== 0) {
            // ================================================================
            // CURVED SEGMENT (bulge ≠ 0)
            // ================================================================
            // Calculate arc length from bulge factor
            // Formula: θ = 4 × atan(|bulge|)
            const theta = 4 * Math.atan(Math.abs(v1.bulge));
            
            // Calculate radius from chord length and central angle
            // Formula: r = chord / (2 × sin(θ/2))
            const radius = chordLength / (2 * Math.sin(theta / 2));
            
            // Calculate arc length: r × θ
            const arcLength = radius * theta;
            totalLength += arcLength;

            // Update bounding box for curved segment
            // This is an approximation using sagitta (arc height)
            // Formula: sagitta = bulge × chord / 2
            const sagitta = Math.abs(v1.bulge * chordLength / 2);
            const midX = (v1.x + v2.x) / 2;
            const midY = (v1.y + v2.y) / 2;
            
            // Expand bounding box to include arc peak
            // Note: This is a simplified approximation; exact calculation would
            // require finding arc center and checking if peak points lie within arc span
            minX = Math.min(minX, v1.x, v2.x, midX - sagitta);
            minY = Math.min(minY, v1.y, v2.y, midY - sagitta);
            maxX = Math.max(maxX, v1.x, v2.x, midX + sagitta);
            maxY = Math.max(maxY, v1.y, v2.y, midY + sagitta);

          } else {
            // ================================================================
            // STRAIGHT SEGMENT (bulge = 0)
            // ================================================================
            totalLength += chordLength;
            
            // Update bounding box with vertex
            minX = Math.min(minX, v1.x);
            minY = Math.min(minY, v1.y);
            maxX = Math.max(maxX, v1.x);
            maxY = Math.max(maxY, v1.y);
          }
        }
        
        // ======================================================================
        // CRITICAL: Add closing segment if polyline is closed
        // ======================================================================
        if (polyData.closed && polyData.vertices.length > 2) {
          const lastV = polyData.vertices[polyData.vertices.length - 1];
          const firstV = polyData.vertices[0];
          
          // Calculate closing segment length
          const closingChordLength = Math.sqrt(
            Math.pow(firstV.x - lastV.x, 2) + 
            Math.pow(firstV.y - lastV.y, 2)
          );
          
          if (lastV.bulge && lastV.bulge !== 0) {
            // Closing segment is curved
            const theta = 4 * Math.atan(Math.abs(lastV.bulge));
            const radius = closingChordLength / (2 * Math.sin(theta / 2));
            const arcLength = radius * theta;
            totalLength += arcLength;
            
            // Update bounding box
            const sagitta = Math.abs(lastV.bulge * closingChordLength / 2);
            const midX = (lastV.x + firstV.x) / 2;
            const midY = (lastV.y + firstV.y) / 2;
            minX = Math.min(minX, midX - sagitta);
            minY = Math.min(minY, midY - sagitta);
            maxX = Math.max(maxX, midX + sagitta);
            maxY = Math.max(maxY, midY + sagitta);
          } else {
            // Closing segment is straight
            totalLength += closingChordLength;
          }
        }
        
        if (polyData.vertices.length > 0) {
          // Add last vertex to bounding box
          const lastV = polyData.vertices[polyData.vertices.length - 1];
          minX = Math.min(minX, lastV.x);
          minY = Math.min(minY, lastV.y);
          maxX = Math.max(maxX, lastV.x);
          maxY = Math.max(maxY, lastV.y);
          
          entities.push(polyData);
        }
      }
      
      // ========================================================================
      // Parse POLYLINE entities (regular polylines - different from LWPOLYLINE)
      // ========================================================================
      // POLYLINE is an older format that uses VERTEX entities
      // Format:
      //   0
      //   POLYLINE
      //   ...
      //   0
      //   VERTEX
      //   10 (X)
      //   20 (Y)
      //   ...
      //   0
      //   SEQEND
      
      if (entityType === 'POLYLINE') {
        const polyData: any = { type: 'POLYLINE', vertices: [], closed: false };
        let j = i + 2;
        
        // Check for closed flag (group code 70)
        for (let k = i + 2; k < Math.min(i + 20, lines.length); k += 2) {
          const code = lines[k];
          const value = lines[k + 1];
          if (code === '0') break; // Hit VERTEX or next entity
          if (code === '70') {
            const flags = parseInt(value);
            polyData.closed = (flags & 1) === 1; // Bit 0 = closed
            break;
          }
        }
        
        // Read until we hit SEQEND
        while (j < lines.length) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') {
            if (value === 'VERTEX') {
              // Read vertex coordinates
              let vx: number | undefined, vy: number | undefined;
              for (let k = j + 2; k < Math.min(j + 20, lines.length); k += 2) {
                const vcode = lines[k];
                const vval = lines[k + 1];
                if (vcode === '0') break; // Next entity
                if (vcode === '10') vx = parseFloat(vval);
                if (vcode === '20') vy = parseFloat(vval);
              }
              if (vx !== undefined && vy !== undefined) {
                polyData.vertices.push({ x: vx, y: vy });
              }
            } else if (value === 'SEQEND') {
              break; // End of polyline
            }
          }
          j += 2;
        }
        
        // Calculate length from vertices
        for (let k = 0; k < polyData.vertices.length - 1; k++) {
          const v1 = polyData.vertices[k];
          const v2 = polyData.vertices[k + 1];
          const segLength = Math.sqrt(
            Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
          );
          totalLength += segLength;
          
          minX = Math.min(minX, v1.x);
          minY = Math.min(minY, v1.y);
          maxX = Math.max(maxX, v1.x);
          maxY = Math.max(maxY, v1.y);
        }
        
        // Add closing segment if polyline is closed
        if (polyData.closed && polyData.vertices.length > 2) {
          const lastV = polyData.vertices[polyData.vertices.length - 1];
          const firstV = polyData.vertices[0];
          const closingLength = Math.sqrt(
            Math.pow(firstV.x - lastV.x, 2) + Math.pow(firstV.y - lastV.y, 2)
          );
          totalLength += closingLength;
        }
        
        if (polyData.vertices.length > 0) {
          const lastV = polyData.vertices[polyData.vertices.length - 1];
          minX = Math.min(minX, lastV.x);
          minY = Math.min(minY, lastV.y);
          maxX = Math.max(maxX, lastV.x);
          maxY = Math.max(maxY, lastV.y);
          entities.push(polyData);
        }
      }
      
      // ========================================================================
      // Parse SPLINE entities (B-spline curves)
      // ========================================================================
      // SPLINE is a complex curve - we approximate using control points
      // This is not exact but good enough for cutting length estimation
      
      if (entityType === 'SPLINE') {
        const splineData: any = { type: 'SPLINE', controlPoints: [] };
        
        for (let j = i + 2; j < Math.min(i + 500, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          
          // Control points use group codes 10/20
          if (code === '10') {
            const x = parseFloat(value);
            const y = lines[j + 3] ? parseFloat(lines[j + 3]) : 0;
            splineData.controlPoints.push({ x, y });
          }
        }
        
        // Approximate spline length using control point polygon
        if (splineData.controlPoints.length >= 2) {
          for (let k = 0; k < splineData.controlPoints.length - 1; k++) {
            const p1 = splineData.controlPoints[k];
            const p2 = splineData.controlPoints[k + 1];
            const segLength = Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            // Multiply by 1.2 as splines are typically longer than their control polygon
            totalLength += segLength * 1.2;
            
            minX = Math.min(minX, p1.x);
            minY = Math.min(minY, p1.y);
            maxX = Math.max(maxX, p1.x);
            maxY = Math.max(maxY, p1.y);
          }
          
          const lastP = splineData.controlPoints[splineData.controlPoints.length - 1];
          minX = Math.min(minX, lastP.x);
          minY = Math.min(minY, lastP.y);
          maxX = Math.max(maxX, lastP.x);
          maxY = Math.max(maxY, lastP.y);
          
          entities.push(splineData);
        }
      }
      
      // ========================================================================
      // Parse ELLIPSE entities
      // ========================================================================
      // ELLIPSE format uses center, major/minor axis
      
      if (entityType === 'ELLIPSE') {
        const ellipseData: any = { type: 'ELLIPSE' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') ellipseData.cx = parseFloat(value); // Center X
          if (code === '20') ellipseData.cy = parseFloat(value); // Center Y
          if (code === '11') ellipseData.majorX = parseFloat(value); // Major axis X
          if (code === '21') ellipseData.majorY = parseFloat(value); // Major axis Y
          if (code === '40') ellipseData.ratio = parseFloat(value); // Ratio of minor to major axis
        }
        
        if (ellipseData.cx !== undefined && ellipseData.cy !== undefined && 
            ellipseData.majorX !== undefined && ellipseData.majorY !== undefined && 
            ellipseData.ratio !== undefined) {
          
          // Calculate semi-major and semi-minor axes
          const a = Math.sqrt(ellipseData.majorX ** 2 + ellipseData.majorY ** 2);
          const b = a * ellipseData.ratio;
          
          // Approximate ellipse circumference using Ramanujan's formula
          const h = Math.pow((a - b) / (a + b), 2);
          const circumference = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
          totalLength += circumference;
          
          // Update bounding box
          minX = Math.min(minX, ellipseData.cx - a);
          minY = Math.min(minY, ellipseData.cy - b);
          maxX = Math.max(maxX, ellipseData.cx + a);
          maxY = Math.max(maxY, ellipseData.cy + b);
          
          entities.push(ellipseData);
        }
      }
    }
  }
  
  // ============================================================================
  // STEP 3: Finalize bounding box (prefer header extents if available)
  // ============================================================================
  // Use header extents ($EXTMIN/$EXTMAX) if available and valid
  // Fallback to calculated bounds from entities if header is missing/invalid
  
  let finalMinX = minX;
  let finalMinY = minY;
  let finalMaxX = maxX;
  let finalMaxY = maxY;
  
  if (headerMinX !== null && headerMinY !== null && headerMaxX !== null && headerMaxY !== null) {
    // Validate header extents (sometimes CAD software sets them to 0,0,0,0)
    // Only use header extents if they seem valid (max > min)
    if (entities.length === 0 || (headerMaxX > headerMinX)) {
        finalMinX = headerMinX;
        finalMinY = headerMinY;
        finalMaxX = headerMaxX;
        finalMaxY = headerMaxY;
    }
  }
  
  // ============================================================================
  // STEP 4: Calculate final dimensions
  // ============================================================================
  const dxfWidth = finalMaxX - finalMinX;
  const dxfHeight = finalMaxY - finalMinY;
  
  return {
    width: dxfWidth,           // Bounding box width (mm)
    height: dxfHeight,         // Bounding box height (mm)
    cuttingLength: totalLength, // Total cutting path length (mm) - used for pricing
    entities,                  // All parsed geometric entities
    minX: finalMinX,
    minY: finalMinY,
    maxX: finalMaxX,
    maxY: finalMaxY
  };
}

/**
 * Generate SVG preview from parsed DXF data
 * 
 * Creates a visual representation of the DXF file for display in the UI.
 * Handles responsive scaling and mobile optimization.
 * 
 * Features:
 * - Fixed 400×300px viewport for consistency
 * - Automatic scaling to fit with padding
 * - Mobile zoom reduction for small parts (prevents excessive magnification)
 * - Adaptive stroke width based on part size
 * - Minimum hole visibility (7px diameter minimum)
 * 
 * @param dxfData - Parsed DXF data from parseDXF()
 * @param windowWidth - Optional window width for mobile detection
 * @returns SVG markup as string
 * 
 * @example
 * const svg = generateSVGPreview(dxfData, window.innerWidth);
 * previewContainer.innerHTML = svg;
 */
export function generateSVGPreview(dxfData: DXFData, windowWidth?: number): string {
  const { width: dxfWidth, height: dxfHeight, entities, minX, minY } = dxfData;
  
  // ============================================================================
  // SVG viewport configuration
  // ============================================================================
  // Fixed viewport size ensures consistent preview across all devices
  const viewportWidth = 400;
  const viewportHeight = 300;
  
  // ============================================================================
  // Calculate scale to fit design in viewport with padding
  // ============================================================================
  const padding = 20; // 20px padding on all sides
  const scaleX = (viewportWidth - 2 * padding) / dxfWidth;
  const scaleY = (viewportHeight - 2 * padding) / dxfHeight;
  let scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
  
  // ============================================================================
  // Mobile optimization: Reduce zoom for small parts
  // ============================================================================
  // Problem: Small parts (<100mm) appear massively zoomed on mobile screens
  // Solution: Apply aggressive zoom reduction (25%) for mobile + small parts
  const isMobile = (windowWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024)) < 768;
  const isSmallPart = Math.max(dxfWidth, dxfHeight) < 100; // Parts smaller than 100mm
  if (isMobile && isSmallPart) {
    scale = scale * 0.25; // Reduce to 25% of calculated scale
  }
  
  // ============================================================================
  // Center the design in viewport
  // ============================================================================
  const offsetX = padding + (viewportWidth - 2 * padding - dxfWidth * scale) / 2 - minX * scale;
  const offsetY = padding + (viewportHeight - 2 * padding - dxfHeight * scale) / 2 - minY * scale;
  
  // ============================================================================
  // Calculate adaptive stroke width
  // ============================================================================
  // Larger parts get thinner strokes, smaller parts get thicker strokes
  // Range: 0.8px (large parts) to 1.5px (small parts)
  const strokeWidth = Math.max(0.8, Math.min(1.5, 1000 / Math.max(dxfWidth, dxfHeight)));
  
  // ============================================================================
  // Minimum hole radius for visibility
  // ============================================================================
  // Small holes must be at least 7px diameter (3.5px radius) to be visible
  const minHoleRadius = 3.5;
  
  let svgContent = '';
  
  // ============================================================================
  // Render all entities to SVG
  // ============================================================================
  entities.forEach((entity: any) => {
    // ==========================================================================
    // Render LINE entities
    // ==========================================================================
    if (entity.type === 'LINE') {
      const x1 = entity.x1 * scale + offsetX;
      const y1 = entity.y1 * scale + offsetY;
      const x2 = entity.x2 * scale + offsetX;
      const y2 = entity.y2 * scale + offsetY;
      svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="${strokeWidth}"/>`;
    } 
    
    // ==========================================================================
    // Render LWPOLYLINE entities
    // ==========================================================================
    else if (entity.type === 'LWPOLYLINE') {
        // Generate SVG path data, handling both straight lines and arcs (bulges)
        let pathD = '';
        
        if (entity.vertices.length > 0) {
            // Move to first vertex
            const v0 = entity.vertices[0];
            pathD += `M ${v0.x * scale + offsetX} ${v0.y * scale + offsetY} `;
            
            // Draw segments between consecutive vertices
            for (let i = 0; i < entity.vertices.length - 1; i++) {
                const v1 = entity.vertices[i];
                const v2 = entity.vertices[i+1];
                const x2 = v2.x * scale + offsetX;
                const y2 = v2.y * scale + offsetY;

                if (v1.bulge && v1.bulge !== 0) {
                    // ============================================================
                    // Curved segment (arc) using SVG arc command
                    // ============================================================
                    // Calculate arc radius from bulge and chord length
                    const chordLength = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
                    const theta = 4 * Math.atan(Math.abs(v1.bulge));
                    const radius = (chordLength / (2 * Math.sin(theta / 2))) * scale;
                    
                    // SVG arc flags
                    const largeArcFlag = Math.abs(theta) > Math.PI ? 1 : 0; // 1 if angle > 180°
                    const sweepFlag = v1.bulge > 0 ? 0 : 1; // Direction based on bulge sign
                    
                    // SVG Arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                    pathD += `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2} `;

                } else {
                    // ============================================================
                    // Straight segment (line) using SVG line command
                    // ============================================================
                    pathD += `L ${x2} ${y2} `;
                }
            }
            
            // ==================================================================
            // Add closing segment if polyline is closed
            // ==================================================================
            if (entity.closed && entity.vertices.length > 2) {
                const lastV = entity.vertices[entity.vertices.length - 1];
                const firstV = entity.vertices[0];
                const x1 = firstV.x * scale + offsetX;
                const y1 = firstV.y * scale + offsetY;
                pathD += `L ${x1} ${y1} `;
            }
        }
        svgContent += `<path d="${pathD}" stroke="#2563eb" stroke-width="${strokeWidth}" fill="none"/>`;

    } 
    
    // ==========================================================================
    // Render CIRCLE entities
    // ==========================================================================
    else if (entity.type === 'CIRCLE') {
      const cx = entity.x * scale + offsetX;
      const cy = entity.y * scale + offsetY;
      const scaledRadius = entity.radius * scale;
      
      // Ensure minimum visibility for small holes
      const r = Math.max(minHoleRadius, scaledRadius);
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="#2563eb" stroke-width="${strokeWidth}" fill="none"/>`;
    } 
    
    // ==========================================================================
    // Render ARC entities
    // ==========================================================================
    else if (entity.type === 'ARC') {
      const cx = entity.x * scale + offsetX;
      const cy = entity.y * scale + offsetY;
      const r = entity.radius * scale;
      
      // Convert DXF angles (degrees, counter-clockwise from X-axis) to radians
      const startAngle = (entity.startAngle * Math.PI) / 180;
      const endAngle = (entity.endAngle * Math.PI) / 180;
      
      // Calculate arc endpoints
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      
      // Calculate angle span for large-arc-flag
      let angleDiff = entity.endAngle - entity.startAngle;
      if (angleDiff < 0) angleDiff += 360;
      const largeArcFlag = angleDiff > 180 ? 1 : 0;
      
      // DXF arcs are always counter-clockwise
      // In SVG coordinate system (Y-axis points down), use sweep=1
      svgContent += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}" stroke="#2563eb" stroke-width="${strokeWidth}" fill="none"/>`;
    }
  });
  
  return `<svg width="${viewportWidth}" height="${viewportHeight}" viewBox="0 0 ${viewportWidth} ${viewportHeight}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}