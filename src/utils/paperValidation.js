/**
 * Automated Paper Validation Utility
 * Uses pdfjs-dist for structural analysis of PDFs.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point pdfjs-dist worker to the CDN (using .mjs for version 5+)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Validates a file against organizer-defined rules.
 * @param {File} file - The file to validate
 * @param {Object} settings - The conference submission settings
 * @returns {Promise<Object>} - { valid: boolean, errors: string[], report: Object }
 */
export const validatePaper = async (file, settings) => {
  const errors = [];
  const warnings = [];
  const { allowed_extensions, max_file_size_mb, require_indentation, indentation_px, check_font_size, min_font_size } = settings;

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
  if (fileExt === '.pdf' && (require_indentation || check_font_size)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = Math.min(pdf.numPages, 3); // Analyze first 3 pages
      let indentationScore = 0;
      let totalLinesChecked = 0;
      let fontSizes = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Analyze x-coordinates (margins) and fonts
        const items = textContent.items;
        if (items.length === 0) continue;

        // Group items by y-coordinate (lines)
        const lines = {}; 
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        const sortedLines = Object.keys(lines).sort((a, b) => b - a); // Top to bottom

        sortedLines.forEach(y => {
          const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const firstItem = lineItems[0];
          
          if (firstItem && firstItem.str.trim().length > 0) {
            const x = firstItem.transform[4];
            
            // Heuristic for indentation: if x is significantly offset from typical left margin
            // Standard left margin is usually between 50-100 points
            if (require_indentation && x > 95 && x < 150) { 
              indentationScore++;
            }
            
            totalLinesChecked++;
            
            if (check_font_size && firstItem.height) {
              fontSizes.push(firstItem.height);
            }
          }
        });
      }

      // Verification logic
      if (require_indentation) {
        // Expect at least some percentage of lines to be indented if required (paragraphs)
        const indentRatio = indentationScore / totalLinesChecked;
        if (indentRatio < 0.05) { // If less than 5% of lines are indented, it's likely missing paragraph indentation
          errors.push(`Missing required paragraph indentation. Please ensure your paper follows the conference style guide.`);
        }
      }

      if (check_font_size && fontSizes.length > 0) {
        const avgFont = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
        if (avgFont < min_font_size) {
          errors.push(`Main text font size (~${avgFont.toFixed(1)}pt) is below the minimum required (${min_font_size}pt).`);
        }
      }

    } catch (err) {
      console.error('PDF Analysis failed:', err);
      warnings.push(`Structural validation skipped: Could not parse PDF content. Please ensure the file is not corrupted.`);
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
