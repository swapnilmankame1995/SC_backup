/**
 * DXF Parser Web Worker
 * Parses DXF files in a background thread to avoid blocking the UI
 */

// DXF Parser logic (copied from utils/dxf-parser.ts but as plain JS)
function parseDXF(content) {
  const lines = content.split('\n').map(l => l.trim());
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let totalLength = 0;
  const entities = [];
  
  // First, try to read extents from HEADER section
  let headerMinX = null;
  let headerMinY = null;
  let headerMaxX = null;
  let headerMaxY = null;
  
  let inHeaderSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'HEADER') {
      inHeaderSection = true;
      continue;
    }
    if (lines[i] === 'ENDSEC' && inHeaderSection) {
      inHeaderSection = false;
      break;
    }
    
    if (inHeaderSection) {
      if (lines[i] === '$EXTMIN') {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j += 2) {
          if (lines[j] === '10') headerMinX = parseFloat(lines[j + 1]);
          if (lines[j] === '20') headerMinY = parseFloat(lines[j + 1]);
          if (lines[j] === '9' || lines[j] === '0') break;
        }
      }
      if (lines[i] === '$EXTMAX') {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j += 2) {
          if (lines[j] === '10') headerMaxX = parseFloat(lines[j + 1]);
          if (lines[j] === '20') headerMaxY = parseFloat(lines[j + 1]);
          if (lines[j] === '9' || lines[j] === '0') break;
        }
      }
    }
  }
  
  // Find ENTITIES section
  let inEntitiesSection = false;
  let processedEntities = 0;
  const totalLines = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    // Report progress periodically
    if (i % 1000 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / totalLines) * 100
      });
    }
    
    const line = lines[i];
    
    if (line === 'ENTITIES') {
      inEntitiesSection = true;
      continue;
    }
    
    if (line === 'ENDSEC' && inEntitiesSection) {
      inEntitiesSection = false;
      continue;
    }
    
    if (!inEntitiesSection) continue;
    
    if (line === '0' && i + 1 < lines.length) {
      const entityType = lines[i + 1];
      
      // Parse LINE entities
      if (entityType === 'LINE') {
        const lineData = { type: 'LINE' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') lineData.x1 = parseFloat(value);
          if (code === '20') lineData.y1 = parseFloat(value);
          if (code === '11') lineData.x2 = parseFloat(value);
          if (code === '21') lineData.y2 = parseFloat(value);
        }
        
        if (lineData.x1 !== undefined && lineData.y1 !== undefined && 
            lineData.x2 !== undefined && lineData.y2 !== undefined) {
          const length = Math.sqrt(
            Math.pow(lineData.x2 - lineData.x1, 2) + 
            Math.pow(lineData.y2 - lineData.y1, 2)
          );
          totalLength += length;
          
          minX = Math.min(minX, lineData.x1, lineData.x2);
          minY = Math.min(minY, lineData.y1, lineData.y2);
          maxX = Math.max(maxX, lineData.x1, lineData.x2);
          maxY = Math.max(maxY, lineData.y1, lineData.y2);
          
          entities.push(lineData);
          processedEntities++;
        }
      }
      
      // Parse CIRCLE entities
      if (entityType === 'CIRCLE') {
        const circleData = { type: 'CIRCLE' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') circleData.x = parseFloat(value);
          if (code === '20') circleData.y = parseFloat(value);
          if (code === '40') circleData.radius = parseFloat(value);
        }
        
        if (circleData.x !== undefined && circleData.y !== undefined && circleData.radius !== undefined) {
          const circumference = 2 * Math.PI * circleData.radius;
          totalLength += circumference;
          
          minX = Math.min(minX, circleData.x - circleData.radius);
          minY = Math.min(minY, circleData.y - circleData.radius);
          maxX = Math.max(maxX, circleData.x + circleData.radius);
          maxY = Math.max(maxY, circleData.y + circleData.radius);
          
          entities.push(circleData);
          processedEntities++;
        }
      }
      
      // Parse ARC entities
      if (entityType === 'ARC') {
        const arcData = { type: 'ARC' };
        
        for (let j = i + 2; j < Math.min(i + 52, lines.length); j += 2) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;
          if (code === '10') arcData.x = parseFloat(value);
          if (code === '20') arcData.y = parseFloat(value);
          if (code === '40') arcData.radius = parseFloat(value);
          if (code === '50') arcData.startAngle = parseFloat(value);
          if (code === '51') arcData.endAngle = parseFloat(value);
        }
        
        if (arcData.x !== undefined && arcData.y !== undefined && 
            arcData.radius !== undefined && arcData.startAngle !== undefined && 
            arcData.endAngle !== undefined) {
          let angleDiff = arcData.endAngle - arcData.startAngle;
          if (angleDiff < 0) angleDiff += 360;
          const arcLength = (angleDiff / 360) * 2 * Math.PI * arcData.radius;
          totalLength += arcLength;
          
          minX = Math.min(minX, arcData.x - arcData.radius);
          minY = Math.min(minY, arcData.y - arcData.radius);
          maxX = Math.max(maxX, arcData.x + arcData.radius);
          maxY = Math.max(maxY, arcData.y + arcData.radius);
          
          entities.push(arcData);
          processedEntities++;
        }
      }
      
      // Parse LWPOLYLINE entities
      if (entityType === 'LWPOLYLINE') {
        const polyData = { type: 'LWPOLYLINE', vertices: [] };
        
        let j = i + 2;
        let currentVertex = null;

        while (j < lines.length) {
          const code = lines[j];
          const value = lines[j + 1];
          
          if (code === '0') break;

          if (code === '10') {
            if (currentVertex) polyData.vertices.push(currentVertex);
            currentVertex = { x: parseFloat(value), bulge: 0 };
          } else if (code === '20') {
            if (currentVertex) currentVertex.y = parseFloat(value);
          } else if (code === '42') {
            if (currentVertex) currentVertex.bulge = parseFloat(value);
          }
          
          j += 2;
        }
        if (currentVertex) polyData.vertices.push(currentVertex);
        
        for (let k = 0; k < polyData.vertices.length - 1; k++) {
          const v1 = polyData.vertices[k];
          const v2 = polyData.vertices[k + 1];
          
          const chordLength = Math.sqrt(
            Math.pow(v2.x - v1.x, 2) + 
            Math.pow(v2.y - v1.y, 2)
          );

          if (v1.bulge && v1.bulge !== 0) {
            const theta = 4 * Math.atan(Math.abs(v1.bulge));
            const radius = chordLength / (2 * Math.sin(theta / 2));
            const arcLength = radius * theta;
            totalLength += arcLength;

            const sagitta = Math.abs(v1.bulge * chordLength / 2);
            const midX = (v1.x + v2.x) / 2;
            const midY = (v1.y + v2.y) / 2;
            minX = Math.min(minX, v1.x, v2.x, midX - sagitta);
            minY = Math.min(minY, v1.y, v2.y, midY - sagitta);
            maxX = Math.max(maxX, v1.x, v2.x, midX + sagitta);
            maxY = Math.max(maxY, v1.y, v2.y, midY + sagitta);

          } else {
            totalLength += chordLength;
            
            minX = Math.min(minX, v1.x);
            minY = Math.min(minY, v1.y);
            maxX = Math.max(maxX, v1.x);
            maxY = Math.max(maxY, v1.y);
          }
        }
        
        if (polyData.vertices.length > 0) {
          const lastV = polyData.vertices[polyData.vertices.length - 1];
          minX = Math.min(minX, lastV.x);
          minY = Math.min(minY, lastV.y);
          maxX = Math.max(maxX, lastV.x);
          maxY = Math.max(maxY, lastV.y);
          
          entities.push(polyData);
          processedEntities++;
        }
      }
    }
  }
  
  // Use header extents if available
  let finalMinX = minX;
  let finalMinY = minY;
  let finalMaxX = maxX;
  let finalMaxY = maxY;
  
  if (headerMinX !== null && headerMinY !== null && headerMaxX !== null && headerMaxY !== null) {
    if (entities.length === 0 || (headerMaxX > headerMinX)) {
        finalMinX = headerMinX;
        finalMinY = headerMinY;
        finalMaxX = headerMaxX;
        finalMaxY = headerMaxY;
    }
  }
  
  const dxfWidth = finalMaxX - finalMinX;
  const dxfHeight = finalMaxY - finalMinY;
  
  return {
    width: dxfWidth,
    height: dxfHeight,
    cuttingLength: totalLength,
    entities,
    minX: finalMinX,
    minY: finalMinY,
    maxX: finalMaxX,
    maxY: finalMaxY
  };
}

// Listen for messages from main thread
self.addEventListener('message', (e) => {
  const { type, content, id } = e.data;
  
  if (type === 'parse') {
    try {
      const result = parseDXF(content);
      
      // Send success result
      self.postMessage({
        type: 'complete',
        id,
        result
      });
    } catch (error) {
      // Send error result
      self.postMessage({
        type: 'error',
        id,
        error: error.message || 'Failed to parse DXF file'
      });
    }
  }
});
