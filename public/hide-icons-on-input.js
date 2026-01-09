/**
 * Global Input Icon Hide Script
 * Automatically hides icons when user types in input fields
 * This runs on every page to ensure icons never overlap with text
 */

(function() {
  'use strict';
  
  // Function to hide/show icon based on input state
  function updateIconVisibility(input) {
    if (!input) return;
    
    const parent = input.closest('.relative, [class*="relative"]');
    if (!parent) return;
    
    // Find all potential icon elements
    const icons = parent.querySelectorAll('.absolute, [class*="absolute"]');
    
    const hasValue = input.value && input.value.length > 0;
    const isFocused = document.activeElement === input;
    
    icons.forEach(icon => {
      // Don't hide if it's a button or interactive element
      if (icon.closest('button') || icon.tagName === 'BUTTON') return;
      
      if (hasValue || isFocused) {
        icon.style.opacity = '0';
        icon.style.pointerEvents = 'none';
      } else {
        icon.style.opacity = '';
        icon.style.pointerEvents = '';
      }
    });
  }
  
  // Initialize on DOM load
  function initialize() {
    // Find all input elements
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], input:not([type])');
    
    inputs.forEach(input => {
      // Add event listeners
      input.addEventListener('focus', () => updateIconVisibility(input));
      input.addEventListener('blur', () => updateIconVisibility(input));
      input.addEventListener('input', () => updateIconVisibility(input));
      input.addEventListener('change', () => updateIconVisibility(input));
      
      // Initial check
      updateIconVisibility(input);
    });
  }
  
  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Also run when new content is added (for dynamic content)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const inputs = node.querySelectorAll ? node.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], input:not([type])') : [];
          inputs.forEach(input => {
            input.addEventListener('focus', () => updateIconVisibility(input));
            input.addEventListener('blur', () => updateIconVisibility(input));
            input.addEventListener('input', () => updateIconVisibility(input));
            input.addEventListener('change', () => updateIconVisibility(input));
            updateIconVisibility(input);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();

