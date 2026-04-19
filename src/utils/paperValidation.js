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
  const { allowed_extensions, max_file_size_mb, require_indentation, indentation_cm, check_font_size, min_font_size } = settings;

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
      const xCounts = {};
      const xPositions = [];
      const fontSizes = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const items = textContent.items;
        if (items.length === 0) continue;

        const lines = {}; 
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        const sortedLines = Object.keys(lines).sort((a, b) => b - a);

        sortedLines.forEach(y => {
          const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const firstItem = lineItems[0];
          
          if (firstItem && firstItem.str.trim().length > 0) {
            const x = Math.round(firstItem.transform[4]);
            xPositions.push(x);
            xCounts[x] = (xCounts[x] || 0) + 1;
            
            const fontSize = firstItem.height || (firstItem.transform ? firstItem.transform[3] : 0);
            if (check_font_size && fontSize > 0) {
              fontSizes.push(fontSize);
            }
          }
        });
      }

      // 3. Analyze Coordinates
      if (xPositions.length > 0) {
        // Find the dominant left margin (mode)
        let baseMargin = 0;
        let maxCount = 0;
        Object.entries(xCounts).forEach(([x, count]) => {
          if (count > maxCount) {
            maxCount = count;
            baseMargin = parseInt(x);
          }
        });

        const cmToPt = 28.35; // 1cm = 72/2.54 points
        const threshold = (indentation_cm || 0.5) * cmToPt;
        const totalLines = xPositions.length;
        let indentedLines = 0;

        xPositions.forEach(x => {
          // A line is indented if it starts significantly to the right of the base margin
          // but not so far as to be centered or part of a nested structure (heuristic < 200)
          if (x >= baseMargin + threshold && x < baseMargin + 150) {
            indentedLines++;
          }
        });

        if (require_indentation) {
          const indentRatio = indentedLines / totalLines;
          // Most academic papers have paragraphs. If less than 3% of lines are indented, it's suspicious.
          if (indentRatio < 0.03) {
            const detectedMarginCm = (baseMargin / cmToPt).toFixed(2);
            errors.push(`Missing paragraph indentation. Detected base margin at ${detectedMarginCm}cm, but found insufficient indented lines. Please ensure paragraphs are indented by at least ${indentation_cm}cm.`);
          }
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
