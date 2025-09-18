/**
 * Department color utilities
 * Maintains single version of truth for department color mapping across the platform
 */

// Default department colors (matching the color picker in department-master.tsx)
const DEFAULT_DEPARTMENT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#64748b", "#6b7280", "#374151", "#111827"
];

// Department color mapping cache
const departmentColorCache = new Map<string, string>();

/**
 * Get a consistent color for a department name
 * Uses actual department colors from database, falls back to hash-based approach
 */
export function getDepartmentColor(departmentName?: string): string {
  if (!departmentName) {
    console.log('No department name provided, using default gray');
    return "#64748b"; // Default gray color
  }

  // Check cache first (this will contain real colors loaded from API)
  if (departmentColorCache.has(departmentName)) {
    const cachedColor = departmentColorCache.get(departmentName)!;
    // console.log('Using cached color for', departmentName, ':', cachedColor);
    return cachedColor;
  }

  // console.log('No cached color found for department:', departmentName, 'using hash-based fallback');

  // Fallback: Generate a consistent hash for the department name
  let hash = 0;
  for (let i = 0; i < departmentName.length; i++) {
    const char = departmentName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use the hash to select a color from the default palette
  const colorIndex = Math.abs(hash) % DEFAULT_DEPARTMENT_COLORS.length;
  const color = DEFAULT_DEPARTMENT_COLORS[colorIndex];

  // Cache the result
  departmentColorCache.set(departmentName, color);

  return color;
}

/**
 * Get background color class for a department
 * Returns a light version of the department color for backgrounds
 */
export function getDepartmentBackgroundColor(departmentName?: string): string {
  const color = getDepartmentColor(departmentName);
  
  // Convert hex to RGB and create a light background
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a more visible but still light version (25% opacity)
  return `rgba(${r}, ${g}, ${b}, 0.25)`;
}

/**
 * Get border color for a department
 * Returns a medium opacity version of the department color for borders
 */
export function getDepartmentBorderColor(departmentName?: string): string {
  const color = getDepartmentColor(departmentName);
  
  // Convert hex to RGB and create a border color
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a more visible border (50% opacity)
  return `rgba(${r}, ${g}, ${b}, 0.5)`;
}

/**
 * Get text color for a department
 * Returns the full department color for text/badges
 */
export function getDepartmentTextColor(departmentName?: string): string {
  return getDepartmentColor(departmentName);
}

/**
 * Get department styling object for React components
 */
export function getDepartmentStyling(departmentName?: string) {
  return {
    backgroundColor: getDepartmentBackgroundColor(departmentName),
    borderColor: getDepartmentBorderColor(departmentName),
    borderWidth: '2px',
    borderStyle: 'solid' as const,
  };
}

/**
 * Get department row styling with stronger background color
 */
export function getDepartmentRowStyling(departmentName?: string) {
  const color = getDepartmentColor(departmentName);
  
  // Debug logging (remove in production)
  // console.log('Department styling for:', departmentName, 'Color:', color);
  
  // Convert hex to RGB and create a more visible background
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.3)`, // Increased opacity for visibility
    borderLeft: `4px solid ${color}`,
    borderRadius: '4px',
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.5)`, // Added full border
  };
}

/**
 * Get department badge styling
 */
export function getDepartmentBadgeStyling(departmentName?: string) {
  const color = getDepartmentColor(departmentName);
  
  return {
    backgroundColor: color,
    color: 'white',
    borderColor: color,
  };
}

/**
 * Clear the department color cache (useful for testing or when department colors are updated)
 */
export function clearDepartmentColorCache(): void {
  departmentColorCache.clear();
}

/**
 * Set a specific color for a department (useful when actual department colors are loaded from API)
 */
export function setDepartmentColor(departmentName: string, color: string): void {
  departmentColorCache.set(departmentName, color);
}

/**
 * Get all cached department colors
 */
export function getCachedDepartmentColors(): Map<string, string> {
  return new Map(departmentColorCache);
}
