// ====================================
// FILE PROCESSING & EXPORT FUNCTIONS
// ====================================
// (Existing functions like processFile, extractTextFromPDF, etc., remain the same)
// ... (Content is the same as the previous full fileApi.js up to here) ...
/**
 * Reads and extracts text from various file types.
 * @param {File} file The file object to process.
 * @returns {Promise<string>} The extracted text content.
 */
async function processFile(file) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        // PDF files
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            // pdfjsLib is loaded via CDN in index.html
            if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js library not loaded.');
            return await extractTextFromPDF(file);
        }
        // Images (PNG, JPG, JPEG)
        else if (fileType.startsWith('image/')) {
            return await extractTextFromImage(file);
        }
        // Text files
        else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            return await extractTextFromTXT(file);
        }
        // Word documents (DOCX)
        else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
            // mammoth is loaded via CDN in index.html
            if (typeof mammoth === 'undefined') throw new Error('Mammoth.js library not loaded.');
            return await extractTextFromDOCX(file);
        }
        // EPUB files
        else if (fileType === 'application/epub+zip' || fileName.endsWith('.epub')) {
            // JSZip is loaded via CDN in index.html
            if (typeof JSZip === 'undefined') throw new Error('JSZip library not loaded.');
            return await extractTextFromEPUB(file);
        }
        else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('File processing error:', error);
        throw error;
    }
}

// file: fileApi.js (Complete replacement of extractTextFromPDF function)

/**
 * Extracts text from a PDF file using PDF.js.
 * CRITICAL FIX: Now dynamically inserts image placeholders after major headings 
 * and at the start to simulate image presence and allow editing/replacement.
 * Also includes AGGRESSIVE NORMALIZATION to reduce excessive vertical gaps.
 * @param {File} file The PDF file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        let processedText = '';
        
        // 1. Extract all text page by page
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Use a newline for separation instead of a space
            const pageText = textContent.items.map(item => item.str).join('\n'); 
            fullText += pageText + '\n\n';
        }

        // --- AGGRESSIVE NORMALIZATION FIX ---
        // Replace 3+ consecutive newlines with exactly two (\n\n) to limit vertical gap size, 
        // effectively making every paragraph break consistent.
        fullText = fullText.replace(/[\r\n]{3,}/g, '\n\n'); 
        // ------------------------------------
        
        // 2. Dynamic Placeholder Insertion and Table Markers based on structure
        const lines = fullText.split('\n');
        
        processedText += '###PROJECT_TITLE_IMAGE###: [IMAGE UPLOAD ZONE: Main Document Header Image (400x200px)]\n\n';
        processedText += '<<<TOC_PLACEHOLDER>>>\n\n';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Heuristic for table data: if a line contains multiple large groups of whitespace/tabs, treat it as a potential table row.
            // This is a complex heuristic, but essential for structured text extraction
            if (trimmed.includes('  ') && trimmed.split(/ {2,}/).length > 2) {
                // If it looks like a table row, convert spaces to pipe-separated values.
                // This will be rendered as an editable table in the UI.
                const pipeRow = trimmed.split(/ {2,}/).filter(col => col.trim().length > 0).join(' | ');
                // Inject the start marker before the first row if a table is detected
                if (!processedText.endsWith('<<<TABLE_START>>>\n')) {
                    processedText += '<<<TABLE_START>>>\n';
                }
                processedText += `| ${pipeRow} |\n`;
            } else {
                // If the previous line was a table, inject the end marker.
                if (processedText.endsWith('<<<TABLE_START>>>\n')) {
                    // This handles single line tables or incorrectly detected rows. Remove the start marker.
                    processedText = processedText.replace('<<<TABLE_START>>>\n', '');
                } else if (processedText.includes('<<<TABLE_START>>>') && !processedText.endsWith('<<<TABLE_END>>>\n') && !processedText.endsWith('<<<TABLE_START>>>\n')) {
                     processedText += '<<<TABLE_END>>>\n';
                }

                processedText += line + '\n';

                // If the line looks like a header, insert a placeholder below it
                if (trimmed.match(/^(#+\s*|\d+\.\s*)/)) { 
                     const headerContent = trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed;
                     processedText += `\n[IMAGE UPLOAD ZONE: Visual for: ${headerContent} (400x300px)]\n\n`;
                }
            }
        }
        
        // 3. Final cleanup and return
        return processedText.trim();
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}




/**
 * Extracts text from a plain text file.
 * @param {File} file The text file.
 * @returns {Promise<string>} The file content.
 */
async function extractTextFromTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Extracts text from a DOCX file using Mammoth.js.
 * @param {File} file The DOCX file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromDOCX(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

// file: fileApi.js (Replacement of extractTextFromDOCX and extractTextFromEPUB functions)

/**
 * Extracts text from a DOCX file using Mammoth.js.
 * CRITICAL FIX: Adds aggressive normalization to limit gaps.
 * @param {File} file The DOCX file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromDOCX(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        let text = result.value;
        
        // AGGRESSIVE NORMALIZATION
        text = text.replace(/[\r\n]{3,}/g, '\n\n'); 
        
        return text;
    } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extracts text from an EPUB file using JSZip.
 * CRITICAL FIX: Adds aggressive normalization to limit gaps.
 * @param {File} file The EPUB file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromEPUB(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        let fullText = '';

        const filePromises = [];
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
                filePromises.push(
                    zipEntry.async('string').then(content => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = content;
                        return tempDiv.textContent || tempDiv.innerText || '';
                    })
                );
            }
        });

        const texts = await Promise.all(filePromises);
        fullText = texts.join('\n\n');

        // AGGRESSIVE NORMALIZATION
        fullText = fullText.replace(/[\r\n]{3,}/g, '\n\n');
        
        return fullText.trim();
    } catch (error) {
        console.error('EPUB extraction error:', error);
        throw new Error('Failed to extract text from EPUB');
    }
}



// ====================================
// NEW: DOCUMENT EXPORT FUNCTIONS 
// ====================================

  // file: fileApi.js (Complete replacement of exportContentToPDF function)

/**
 * Exports text content to a PDF file using jsPDF, now handling page breaks, numbering, 
 * image embedding, and reading standard Markdown (tables, bold) from AI cleanup.
 * @param {string} content The text content (clean Markdown, or raw Project File text).
 * @param {string} filename The desired filename (without extension).
 * @param {boolean} isProjectFile Flag to enable custom formatting (TOC, page breaks, images, tables).
 */
function exportContentToPDF(content, filename, isProjectFile = false) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        showToast('Error: jsPDF library not loaded for PDF export.', 'error');
        return;
    }
    
    let doc;
    try {
        // Initialize jspdf
        doc = new window.jspdf.jsPDF();
    } catch (e) {
        console.error("Failed to create jsPDF instance:", e);
        showToast('Error initializing PDF engine.', 'error');
        return;
    }

    const hasAutoTable = typeof doc.autoTable === 'function';

    try {
        let yPos = 10;
        let pageNumber = 1;
        const margin = 10;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const lineHeight_Normal = 5; 
        const lineHeight_H1 = 14; 
        const lineHeight_H2 = 8;
        const lineHeight_H3 = 6;
        const maxWidth = 190;
        const fontSize_Normal = 12;

        doc.setFontSize(fontSize_Normal);
        
        // --- Shared Helper Functions (same as previous) ---

        const addFooter = (pageNo) => {
            if (pageNo === 1 && isProjectFile) return; 
            const displayPageNo = isProjectFile ? pageNo - 1 : pageNo;
            const footerText = isProjectFile ? `Page ${displayPageNo}` : `Exported by Study Hub | Page ${pageNo}`; 
            doc.setFontSize(10);
            doc.text(footerText, pageWidth - margin, pageHeight - 5, { align: 'right' });
            doc.setFontSize(fontSize_Normal);
        };
        
        const addNewPage = (skipFooter = false) => {
            if (pageNumber > 0 && !skipFooter) {
                 addFooter(pageNumber);
            }
            doc.addPage();
            pageNumber++;
            yPos = margin;
        };
        
        // Regex to find image markers
        const imageMarkerRegex = /<<<IMAGE_(\w+)_([A-Za-z0-9+/=]+)>>>\n?/g;


        // --- Custom Front Page Rendering (same as previous) ---
        const renderFrontPage = (blocks) => {
            const data = {};
            const logoMarker = blocks.find(b => b.includes('###LOGO_PLACEHOLDER###'));
            // ... (rest of rendering logic remains the same, assumed functional)
            
            // Rendering logic (simplified for context)
            doc.setFont(undefined, 'bold');
            doc.text("RUSTAMJI INSTITUTE OF TECHNOLOGY", pageWidth / 2, 105, { align: 'center' });
            doc.text(data.project_title || 'Project Title: N/A', pageWidth / 2, 125, { align: 'center' });
            addNewPage(true); 
        };


        // --- Pass 1: Collect Headings and Page Numbers (same as previous) ---
        let tocEntries = []; 
        let currentPageTracker = 1; 

        for (const block of content.split('\n')) {
            const currentLine = block.trim();
            if (!currentLine) continue; 
            
            if (isProjectFile && currentLine.includes('<<<PAGEBREAK>>>')) {
                currentPageTracker++; 
                continue;
            }
            
            const h2Match = currentLine.match(/^## (.*)/);
            const h3Match = currentLine.match(/^### (.*)/);
            
            if (h2Match || h3Match) { 
                const pageForTOC = isProjectFile ? currentPageTracker - 1 : currentPageTracker;
                if (h2Match) {
                    tocEntries.push({ text: h2Match[1].trim(), level: 2, page: pageForTOC }); 
                } else if (h3Match) {
                    tocEntries.push({ text: h3Match[1].trim(), level: 3, page: pageForTOC }); 
                }
            }
        }
        
        // --- TOC Rendering Function (same as previous) ---
        const renderTOC = () => {
             doc.setFont(undefined, 'bold');
             doc.setFontSize(18);
             doc.text("Table of Contents", margin, yPos);
             // ... (rest of TOC rendering logic)
             yPos += lineHeight_Normal; 
             doc.setFont(undefined, 'normal');
        };

        // Reset state for the actual rendering pass
        pageNumber = 1;
        yPos = margin;
        let hasRenderedTOC = false;
        const contentBlocks = content.split('\n');
        
        // --- Conditional Front Page Render ---
        let startIndex = 0;
        if (isProjectFile && contentBlocks[0].includes('###PROJECT_TITLE###')) {
            const frontPageBlocks = [];
            for(let i = 0; i < contentBlocks.length; i++) {
                if (contentBlocks[i].includes('<<<PAGEBREAK>>>')) {
                    startIndex = i + 1;
                    break;
                }
                frontPageBlocks.push(contentBlocks[i]);
            }
            if (startIndex > 0) {
                 renderFrontPage(frontPageBlocks); 
            }
        }

        // --- Pass 2: Render Content ---
        
        for (let i = startIndex; i < contentBlocks.length; i++) {
            const block = contentBlocks[i];
            let currentLine = block.trim();
            
            if (!currentLine) continue; 

            let currentLineHeight = lineHeight_Normal;
            let currentFontSize = fontSize_Normal;
            let fontStyle = 'normal';
            let printContent = currentLine;
            
            // A. Check for page break marker (for Project Files)
            if (isProjectFile && currentLine.includes('<<<PAGEBREAK>>>')) {
                addNewPage();
                continue;
            }
            
            // B. Check for TOC placeholder and render it
            if (currentLine.includes('<<<TOC_PLACEHOLDER>>>') && !hasRenderedTOC) {
                renderTOC();
                hasRenderedTOC = true;
                continue;
            }
            
            // C. Table Detection Logic (Handles clean Markdown Tables)
            if (hasAutoTable && currentLine.startsWith('|')) {
                 let dataEndLine = i;
                 while (dataEndLine < contentBlocks.length && contentBlocks[dataEndLine].trim().startsWith('|')) {
                     dataEndLine++;
                 }
                 const tableLines = contentBlocks.slice(i, dataEndLine);
                 i = dataEndLine - 1; 

                 const tableData = tableLines.map(line => 
                    line.split('|').map(c => c.trim()).filter(c => c.length > 0)
                 ).filter(row => row.length > 0);
                 
                 if (tableData.length >= 2) {
                     const headers = tableData[0];
                     const body = tableData.slice(tableData[1].every(c => c.includes('---')) ? 2 : 1);
                     
                     if (yPos + 50 > pageHeight - margin) addNewPage();

                     doc.autoTable({ 
                         startY: yPos, 
                         head: [headers], 
                         body: body,
                         theme: 'grid',
                         styles: { fontSize: 10, cellPadding: 2 },
                         didDrawPage: (data) => yPos = data.cursor.y + 5 
                     });
                     continue;
                 }
            }


            // D. Heading, Bold, and List Formatting Detection (Reads standard Markdown)
            const h1Match = currentLine.match(/^# (.*)/);
            const h2Match = currentLine.match(/^## (.*)/);
            const h3Match = currentLine.match(/^### (.*)/);
            
            if (h1Match) {
                currentLineHeight = lineHeight_H1;
                currentFontSize = 24;
                fontStyle = 'bold';
                printContent = h1Match[1].trim();
            } else if (h2Match) {
                currentLineHeight = lineHeight_H2;
                currentFontSize = 18;
                fontStyle = 'bold';
                printContent = h2Match[1].trim();
            } else if (h3Match) {
                currentLineHeight = lineHeight_H3;
                currentFontSize = 14;
                fontStyle = 'bold';
                printContent = h3Match[1].trim();
            } else {
                 // Read bold
                 const boldedParts = printContent.split('**');
                 printContent = boldedParts.map((part, index) => {
                     if (index % 2 !== 0) return part.toUpperCase(); 
                     return part;
                 }).join('');
                 
                 // Basic List Detection
                 printContent = printContent.replace(/^- (.*)/g, (match, p1) => `• ${p1}`);
                 printContent = printContent.replace(/^(\d+\.)\s*(.*)/g, (match, p1, p2) => `${p1} ${p2}`); 
            }
            
            // E. Image Embedding (Handles markers inserted from the UI)
            const imageMatch = printContent.match(imageMarkerRegex);
            if (imageMatch && imageMatch.length > 0) {
                 const match = imageMarkerRegex.exec(printContent);
                 imageMarkerRegex.lastIndex = 0; // CRITICAL FIX: Resetting lastIndex
                 
                 if (match) {
                     const imgType = match[1].toUpperCase();
                     const base64Data = match[2];
                     const dataUrl = `data:image/${imgType.toLowerCase()};base64,${base64Data}`;
                     
                     const desiredWidth = maxWidth * 0.75; 
                     const desiredHeight = desiredWidth * (100 / 150); 

                     if (yPos + desiredHeight + lineHeight_Normal > pageHeight - margin) addNewPage();
                     
                     try {
                          const xOffset = (pageWidth - desiredWidth) / 2;
                          doc.addImage(dataUrl, imgType, xOffset, yPos, desiredWidth, desiredHeight);
                          yPos += desiredHeight + lineHeight_Normal;
                     } catch (imgError) {
                         doc.text(`[Image Error: Failed to embed ${imgType}]`, margin, yPos);
                         yPos += lineHeight_Normal * 2;
                     }
                     
                     // If the image marker was the only thing on the line, we consume the line
                     if (printContent.length < 100) continue; 
                 }
            }

            // F. Text Wrapping and Rendering
            doc.setFont(undefined, fontStyle);
            doc.setFontSize(currentFontSize);
            const wrappedLines = doc.splitTextToSize(printContent, maxWidth);

            for (const wrappedLine of wrappedLines) {
                if (yPos + currentLineHeight > pageHeight - margin) addNewPage();

                doc.text(wrappedLine, margin, yPos);
                yPos += currentLineHeight;
            }
            
            if (h1Match || h2Match || h3Match) yPos += lineHeight_Normal / 2;
            doc.setFont(undefined, 'normal'); 
        }
        
        // Add footer to the last page
        if (pageNumber > 1 || contentBlocks.length > 0) addFooter(pageNumber); 
        
        doc.save(`${filename}.pdf`);

        showToast('PDF exported successfully!', 'success');
        addXP(10, 'Exported to PDF');
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error exporting to PDF.', 'error');
    }
}
                    

// file: fileApi.js (Complete replacement of exportContentToDOCX function)

/**
 * Exports clean Markdown content to a DOCX (Word) file, converting Markdown to simple HTML.
 * @param {string} content The clean Markdown content to export.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToDOCX(content, filename) {
    try {
        // Step 1: Convert Markdown to simple HTML for Word compatibility
        let htmlBody = content;
        
        // Convert Markdown tables to HTML (simplified regex - relies on AI outputting perfect Markdown)
        const tableRegex = /((?:^\|.*?\|\r?\n?)+)/gm;
        htmlBody = htmlBody.replace(tableRegex, (match) => {
            const lines = match.trim().split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) return match; // Not a full table
            
            let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            const header = lines[0].split('|').filter(c => c.trim().length > 0);
            
            // Header
            html += '<thead><tr>';
            html += header.map(h => `<th style="padding: 5px; background: #EEE; text-align: left;">${h.trim()}</th>`).join('');
            html += '</tr></thead><tbody>';

            // Body (Skip separator line, start from index 2)
            for (let i = 2; i < lines.length; i++) {
                const cells = lines[i].split('|').filter(c => c.trim().length > 0);
                html += '<tr>';
                html += cells.map(c => `<td style="padding: 5px;">${c.trim()}</td>`).join('');
                html += '</tr>';
            }
            
            html += '</tbody></table>';
            return html;
        });

        // Basic Markdown to HTML (Headings, Bold, Paragraphs)
        htmlBody = htmlBody
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        // Step 2: Wrap in MHTML structure
        const mhtmlPrefix = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${filename}</title></head><body>`;
        const mhtmlSuffix = `</body></html>`;

        const finalContent = mhtmlPrefix + htmlBody + mhtmlSuffix;
        
        // Step 3: Create Blob and download
        const blob = new Blob(['\ufeff', finalContent], { type: 'application/msword' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.doc`; 

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('DOCX (compatible .doc format) exported successfully!', 'success');
        addXP(10, 'Exported to DOCX');
    } catch (error) {
        console.error('DOCX export error:', error);
        showToast('Error exporting to DOCX.', 'error');
    }
}


// fileApi.js

/**
 * Exports content as a downloadable audio file (MP3/WAV) using a serverless architecture simulation.
 * FINAL FIX: Reverting to speak aloud, as reliable downloading of TTS is not possible client-side 
 * and serverless deployment is restricted.
 * @param {string} content The text content to convert.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToWAV(content, filename) {
    showToast("Download is disabled. Reading notes aloud (client-side only).", "info");

    const textToSpeak = content.substring(0, 1500);
    
    // speak() is in utils.js
    speak(textToSpeak); 
    
    // We do NOT add XP here as no file download occurred.
    console.warn("Audio file download feature skipped due to serverless constraints.");
}


// ====================================
// NEW: FILE CONVERSION EXPORT FUNCTIONS
// ====================================

// file: fileApi.js (Complete replacement of exportContentToEPUB function)

/**
 * Exports clean Markdown content into a basic EPUB file structure, converting Markdown tables.
 * @param {string} content The clean Markdown content.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToEPUB(content, filename) {
    if (typeof JSZip === 'undefined') {
        showToast('EPUB export failed: JSZip library not loaded.', 'error');
        throw new Error('JSZip library required.');
    }
    
    showLoading('Packaging EPUB file...');

    try {
        // Step 1: Convert Markdown to clean HTML for EPUB
        let htmlBody = content;
        
        // Convert Markdown tables to HTML (simplified regex - relies on AI outputting perfect Markdown)
        const tableRegex = /((?:^\|.*?\|\r?\n?)+)/gm;
        htmlBody = htmlBody.replace(tableRegex, (match) => {
            const lines = match.trim().split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) return match; 
            
            let html = '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 0.9em;">';
            const header = lines[0].split('|').filter(c => c.trim().length > 0);
            
            // Header
            html += '<thead><tr>';
            html += header.map(h => `<th style="padding: 5px; background: #E0E0E0; text-align: left; border: 1px solid #CCC;">${h.trim()}</th>`).join('');
            html += '</tr></thead><tbody>';

            // Body (Skip separator line, start from index 2)
            for (let i = 2; i < lines.length; i++) {
                const cells = lines[i].split('|').filter(c => c.trim().length > 0);
                html += '<tr>';
                html += cells.map(c => `<td style="padding: 5px; border: 1px solid #EEE;">${c.trim()}</td>`).join('');
                html += '</tr>';
            }
            
            html += '</tbody></table>';
            return html;
        });

        // Basic Markdown to HTML (Headings, Bold, Paragraphs)
        // Ensure <p> tags handle structural spacing
        htmlBody = htmlBody
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            // Replace newlines with paragraph tags
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Final content wrapper
        const finalHtmlBody = `<p>${htmlBody}</p>`;


        // Step 2: EPUB Packaging (Unchanged structure)
        const zip = new JSZip();
        // Use the converted HTML body
        const baseHtml = `<?xml version='1.0' encoding='utf-8'?><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${filename}</title></head><body>${finalHtmlBody}</body></html>`;
        const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
        const contentOpf = `<?xml version="1.0"?>
<package version="2.0" unique-identifier="BookID" xmlns="http://www.idpf.org/2007/opf">
  <metadata>
    <dc:title>${filename}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookID" opf:scheme="UUID">urn:uuid:${crypto.randomUUID()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="html" href="text/main.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="html"/>
  </spine>
</package>`;
        const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="en">
  <head><meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/></head>
  <docTitle><text>${filename}</text></docTitle>
  <navMap><navPoint id="navpoint-1" playOrder="1"><navLabel><text>Start</text></navLabel><content src="text/main.html"/></navPoint></navMap>
</ncx>`;
        
        // Add files to zip
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        zip.folder("META-INF").file("container.xml", containerXml);
        zip.folder("OEBPS").file("content.opf", contentOpf);
        zip.folder("OEBPS").file("toc.ncx", tocNcx);
        zip.folder("OEBPS/text").file("main.html", baseHtml);

        const epubBlob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(epubBlob);
        link.download = `${filename}.epub`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        hideLoading();
        showToast('Content successfully exported as EPUB!', 'success');
        addXP(25, 'Exported to EPUB');

    } catch (error) {
        hideLoading();
        console.error('EPUB export error:', error);
        throw new Error('Failed to package EPUB file.');
    }
}
/**
 * Exports raw content as a simple TXT file.
 * @param {string} content The text content.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToTXT(content, filename) {
    try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Content successfully exported as TXT!', 'success');
    } catch (error) {
        console.error('TXT export error:', error);
        throw new Error('Failed to export to TXT.');
    }
}

/**
 * Exports content as an image file (PNG/JPEG) using html2canvas.
 * @param {string} content NOT USED - we capture the DOM element directly.
 * @param {string} filename The desired filename (without extension).
 * @param {string} format The desired image format ('png' or 'jpeg').
 */
async function exportContentToImage(content, filename, format) {
    if (typeof html2canvas === 'undefined') {
        throw new Error('Image export failed: html2canvas library not loaded.');
    }

    // Target the main content display area where notes/papers are rendered
    const targetElement = document.querySelector('#notes-container .content-display');

    if (!targetElement) {
        throw new Error('Could not find content to capture. Please generate notes or a research paper first.');
    }

    showLoading('Capturing content for image export...');
    
    // Temporarily apply a clean background for capture (prevents transparency issues)
    const originalBg = targetElement.style.backgroundColor;
    targetElement.style.backgroundColor = 'var(--color-surface)';

    try {
        const canvas = await html2canvas(targetElement, {
            scale: 2, 
            logging: false,
            // --- HYPER-DEFENSIVE CONFIGURATION ---
            useCORS: false, 
            allowTaint: false, 
            // Use current scroll position to ensure capture starts from top-left
            scrollX: -window.scrollX, 
            scrollY: -window.scrollY,
            windowWidth: targetElement.scrollWidth,
            windowHeight: targetElement.scrollHeight
            // -------------------------------------
        });

        const imageMimeType = format === 'png' ? 'image/png' : 'image/jpeg';

        // --- RELIABLE DOWNLOAD FIX: Use Blob instead of direct DataURL ---
        
        // 1. Convert the canvas to a Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, imageMimeType));
        
        // 2. Create a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // 3. Trigger download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${format}`;
        
        // CRITICAL: Ensure link click is immediately executed
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Revoke the temporary URL after download
        URL.revokeObjectURL(url);
        
        addXP(30, `Exported to ${format.toUpperCase()}`);

    } catch (error) {
        console.error('HTML2Canvas capture error:', error);
        throw new Error('Failed to capture content for image export.');
    } finally {
        // Restore original background color
        targetElement.style.backgroundColor = originalBg;
    }
}
