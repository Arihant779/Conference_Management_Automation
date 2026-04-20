/**
 * Automated Paper Validation Utility
 * Uses pdfjs-dist for structural analysis of PDFs.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point pdfjs-dist worker to the CDN (using .mjs for version 5+)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Validates a file against organizer-defined rules.
 * @param {File} file - The file to validate
 * @param {Object} settings - The conference submission settings
 * @returns {Promise<Object>} - { valid: boolean, errors: string[], report: Object }
 */
export const validatePaper = async (file, settings) => {
  const errors = [];
  const warnings = [];
  const { allowed_extensions, max_file_size_mb, check_font_size, min_font_size } = settings;

  // 1. Basic checks
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowed_extensions.includes(fileExt)) {
    errors.push(`File type ${fileExt} is not allowed. Supported formats: ${allowed_extensions.join(', ')}`);
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > max_file_size_mb) {
    errors.push(`File is too large (${fileSizeMB.toFixed(1)}MB). Maximum allowed is ${max_file_size_mb}MB.`);
  }

  // If there are fatal errors already, stop here
  if (errors.length > 0) return { valid: false, errors, warnings, report: { fileExt, fileSizeMB } };

  // 2. Structural checks (PDF only)
  if (fileExt === '.pdf' && check_font_size) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = Math.min(pdf.numPages, 3); // Analyze first 3 pages
      const fontSizes = {};

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach(item => {
          if (item.str && item.str.trim().length > 0) {
            // Extract Y-scale (points) roughly mapping to font size
            const fontSize = Math.round(item.height || (item.transform ? item.transform[3] : 0));
            if (fontSize > 0) {
              const weight = item.str.length;
              fontSizes[fontSize] = (fontSizes[fontSize] || 0) + weight;
            }
          }
        });
      }

      if (Object.keys(fontSizes).length > 0) {
         let mainFontSize = 0;
         let maxWeight = 0;
         
         // Mode calculation: find font size with most text
         Object.entries(fontSizes).forEach(([size, weight]) => {
            if (weight > maxWeight) {
               maxWeight = weight;
               mainFontSize = parseInt(size);
            }
         });

         if (mainFontSize < min_font_size) {
            errors.push(`Main document font size (~${mainFontSize}pt) is below the minimum required (${min_font_size}pt).`);
         }
      }
    } catch (err) {
      console.error('PDF Analysis failed:', err);
      warnings.push('Structural validation skipped: Could not parse PDF content.');
    }
  }


  return {
    valid: errors.length === 0,
    errors,
    warnings,
    report: {
      fileExt,
      fileSizeMB: fileSizeMB.toFixed(2),
      engine: 'pdfjs-dist'
    }
  };
};
