/**
 * Applies the Lovable theme styles to the document
 */
export function applyLovableTheme() {
  const root = document.documentElement;
  
  // Add theme class
  root.classList.add('lovable-theme');
  
  // Set theme color meta tag
  let themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColor);
  }
  themeColor.setAttribute('content', '#6E59F9'); // Primary color
}

/**
 * Removes the Lovable theme styles from the document
 */
export function removeLovableTheme() {
  const root = document.documentElement;
  root.classList.remove('lovable-theme');
  
  // Reset theme color meta tag
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', '');
  }
}

/**
 * Initializes theme based on the current skin
 * @param skin The current skin ('lovable' or 'classic')
 */
export function initializeTheme(skin: string) {
  if (skin === 'lovable') {
    applyLovableTheme();
  } else {
    removeLovableTheme();
  }
}
