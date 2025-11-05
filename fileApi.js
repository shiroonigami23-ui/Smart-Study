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

/**
 * Extracts text from a PDF file using PDF.js.
 * @param {File} file The PDF file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
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

/**
 * Extracts text from an EPUB file using JSZip.
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
 * image embedding, and a true two-pass TOC generation, and table rendering.
 * @param {string} content The text content to export.
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
        
        // --- Shared Helper Functions ---

        const addFooter = (pageNo) => {
            // Do NOT add footer/page number to the first page (front page)
            if (pageNo === 1 && isProjectFile) return; 
            
            const footerText = isProjectFile ? `Page ${pageNo - 1}` : `Exported by Study Hub | Page ${pageNo}`; // Adjusted page count for front page skip
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

        const imageMarkerRegex = /<<<IMAGE_(\w+)_([A-Za-z0-9+/=]+)>>>/g;
        
        // --- Custom Front Page Rendering ---
        const renderFrontPage = (blocks) => {
            const data = {};
            const logoMarker = blocks.find(b => b.includes('###LOGO_PLACEHOLDER###'));
            
            // 1. Extract Data
            blocks.filter(b => b.startsWith('###')).forEach(b => {
                const parts = b.split(':', 2);
                const key = parts[0].replace(/#| /g, '').toLowerCase();
                data[key] = parts[1] ? parts[1].trim() : '';
            });

            // 2. Render Logo/Institution (Top Center)
            const logoMatch = logoMarker ? logoMarker.match(imageMarkerRegex) : null;
            const instituteName = data.institution_name || 'Your Institution Name';
            const projectTitle = data.project_title || 'Project Title: Untitled Project';
            const subject = data.subject || 'Subject: General';

            // Logo Placeholder
            const logoWidth = 50;
            const logoHeight = 50;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.rect(logoX, 40, logoWidth, logoHeight); // Visual box for logo area
            
            if (logoMatch && logoMatch.length > 0) {
                 const imgMatch = imageMarkerRegex.exec(logoMatch[0]); 
                 imageMarkerRegex.lastIndex = 0; 
                 if (imgMatch) {
                     const imgType = imgMatch[1].toUpperCase();
                     const base64Data = imgMatch[2];
                     const dataUrl = `data:image/${imgType.toLowerCase()};base64,${base64Data}`;
                     try {
                          doc.addImage(dataUrl, imgType, logoX + 5, 45, logoWidth - 10, logoHeight - 10);
                     } catch (e) {
                         doc.text("Logo", pageWidth / 2, 65, { align: 'center' });
                     }
                 }
            } else {
                 doc.text("Logo Area", pageWidth / 2, 65, { align: 'center' });
            }
            
            // Institution Name
            doc.setFont(undefined, 'bold');
            doc.setFontSize(20);
            doc.text(instituteName, pageWidth / 2, 105, { align: 'center' });
            
            // Project Title & Subject
            doc.setFontSize(26);
            doc.text(projectTitle, pageWidth / 2, 125, { align: 'center' });
            
            doc.setFontSize(16);
            doc.text(subject, pageWidth / 2, 140, { align: 'center' });
            
            // Horizontal Separator
            doc.line(margin, 150, pageWidth - margin, 150); 
            
            // Date
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Date: ${data.date || new Date().toLocaleDateString()}`, pageWidth / 2, 160, { align: 'center' });

            // 3. Render Student/Supervisor (Bottom Left/Right)
            const studentDetails = data.student_details || 'Student Name, Roll No., Class';
            const supervisorDetails = data.supervisor_details || 'Teacher/Supervisor Name';

            // Student Section (Left)
            let yBottom = pageHeight - 70;
            doc.setFont(undefined, 'bold');
            doc.text("Submitted By:", margin + 5, yBottom);
            doc.setFont(undefined, 'normal');
            doc.text(studentDetails, margin + 5, yBottom + 7);
            doc.line(margin + 5, yBottom + 18, margin + 80, yBottom + 18); // Signature line
            doc.setFontSize(10);
            doc.text("(Signature of Student)", margin + 5, yBottom + 23);

            // Supervisor Section (Right)
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("Certified By:", pageWidth - margin - 5, yBottom, { align: 'right' });
            doc.setFont(undefined, 'normal');
            doc.text(supervisorDetails, pageWidth - margin - 5, yBottom + 7, { align: 'right' });
            doc.line(pageWidth - margin - 80, yBottom + 18, pageWidth - margin - 5, yBottom + 18); // Signature line
            doc.setFontSize(10);
            doc.text("(Signature of Supervisor)", pageWidth - margin - 5, yBottom + 23, { align: 'right' });
            
            // Move to the next page
            doc.addPage(); 
            pageNumber++;
            yPos = margin;
        };


        // --- Pass 1: Collect Headings and Page Numbers ---
        
        let tocEntries = []; 
        let currentPageTracker = 1; // Tracks page number for mapping headings

        for (const block of content.split('\n')) {
            const currentLine = block.trim();
            if (!currentLine) continue; 
            
            if (isProjectFile && currentLine.includes('--- PAGE BREAK')) {
                currentPageTracker++; 
                continue;
            }
            
            // Collect headings only for non-front page content
            if (currentPageTracker > 1) { 
                const h2Match = currentLine.match(/^## (.*)/);
                const h3Match = currentLine.match(/^### (.*)/);
                
                if (h2Match) {
                    tocEntries.push({ text: h2Match[1].trim(), level: 2, page: currentPageTracker - 1 }); // Adjusted page num
                } else if (h3Match) {
                    tocEntries.push({ text: h3Match[1].trim(), level: 3, page: currentPageTracker - 1 }); // Adjusted page num
                }
            }
        }
        
        // --- TOC Rendering Function ---
        const renderTOC = () => {
             doc.setFont(undefined, 'bold');
             doc.setFontSize(18);
             doc.text("Table of Contents", margin, yPos);
             yPos += lineHeight_H2;

             doc.setFont(undefined, 'normal');
             doc.setFontSize(fontSize_Normal);
             
             for (const entry of tocEntries) {
                 const indent = (entry.level - 2) * 20; 
                 const text = `${' '.repeat(Math.max(0, indent / 4))} ${entry.text}`; // Reduced visual indent
                 const pageNumText = entry.page.toString();
                 
                 if (yPos + lineHeight_Normal > pageHeight - margin) {
                     addNewPage();
                 }

                 doc.text(text, margin, yPos);
                 doc.text(pageNumText, pageWidth - margin, yPos, { align: 'right' });
                 yPos += lineHeight_Normal;
             }
             yPos += lineHeight_Normal; 
             doc.setFont(undefined, 'normal');
        };

        // Reset state for the actual rendering pass
        pageNumber = 1;
        yPos = margin;
        let hasRenderedTOC = false;
        const contentBlocks = content.split('\n');
        
        // --- Conditional Front Page Render ---
        if (isProjectFile && contentBlocks[0].includes('###PROJECT_TITLE###')) {
            // Find all blocks until the first page break
            const frontPageBlocks = [];
            for(const block of contentBlocks) {
                if (block.includes('--- PAGE BREAK')) break;
                frontPageBlocks.push(block);
            }
            // Render the complex front page layout
            renderFrontPage(frontPageBlocks); 
            
            // Advance the index to start rendering actual content from the Introduction/TOC
            // Find the line index of the first actual content after the front page break
            let startIndex = 0;
            for(let i = 0; i < contentBlocks.length; i++) {
                if (contentBlocks[i].includes('--- PAGE BREAK')) {
                    startIndex = i + 1;
                    break;
                }
            }
            i = startIndex;
        }

        // --- Pass 2: Render Content and TOC ---
        
        for (let i = 0; i < contentBlocks.length; i++) {
            const block = contentBlocks[i];
            let currentLine = block.trim();
            
            // If the front page was rendered, skip the first page's content blocks
            if (isProjectFile && pageNumber === 1 && currentLine.includes('###PROJECT_TITLE###')) {
                continue; 
            }
            if (!currentLine) continue; 

            let currentLineHeight = lineHeight_Normal;
            let currentFontSize = fontSize_Normal;
            let fontStyle = 'normal';
            let printContent = currentLine;
            
            // A. Check for page break marker
            if (isProjectFile && currentLine.includes('<<<PAGEBREAK>>>')) {
                addNewPage();
                continue;
            }
            
            // B. Check for TOC placeholder and render it
            if (isProjectFile && currentLine.includes('<<<TOC_PLACEHOLDER>>>') && !hasRenderedTOC) {
                renderTOC();
                hasRenderedTOC = true;
                continue;
            }
            
            // C. Table Detection Logic (EXISTING LOGIC)
            if (isProjectFile && currentLine.includes('|') && currentLine.match(/\|[^|]*\|/)) {
                const tableContent = [];
                let header = currentLine;
                let dataStartLine = i + 1;

                while (dataStartLine < contentBlocks.length && contentBlocks[dataStartLine].trim().includes('---')) {
                    dataStartLine++; 
                }

                let dataEndLine = dataStartLine;
                while (dataEndLine < contentBlocks.length && contentBlocks[dataEndLine].trim().includes('|')) {
                    tableContent.push(contentBlocks[dataEndLine]);
                    dataEndLine++;
                }

                if (tableContent.length > 0) {
                    const headers = header.split('|').map(h => h.trim()).filter(h => h.length > 0);
                    const body = tableContent.map(row => 
                        row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
                    );

                    const roughTableHeight = (headers.length + body.length) * 8; 
                    if (yPos + roughTableHeight > pageHeight - margin) {
                        addNewPage();
                    }

                    if (hasAutoTable) {
                        doc.autoTable({
                            startY: yPos,
                            head: [headers],
                            body: body,
                            margin: { left: margin, right: margin },
                            theme: 'grid',
                            styles: { fontSize: 10, cellPadding: 2, lineWidth: 0.1, overflow: 'linebreak' }, 
                            headStyles: { fillColor: [63, 81, 181] }, 
                            didDrawPage: (data) => {
                                yPos = data.settings.startY + data.settings.margin.top; 
                            }
                        });
                        yPos = doc.lastAutoTable.finalY + lineHeight_Normal;
                        i = dataEndLine - 1; 
                        continue;
                    } else {
                        doc.text("⚠️ Table content (requires autotable for visual rendering):", margin, yPos);
                        yPos += lineHeight_Normal;
                        i = dataEndLine - 1; 
                        continue;
                    }
                }
            }


            // D. Heading and Formatting Detection
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
                 printContent = printContent.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1.toUpperCase());
                 printContent = printContent.replace(/^- (.*)/g, (match, p1) => `• ${p1}`);
            }
            
            // E. Image Embedding
            const imageMatch = printContent.match(imageMarkerRegex);
            if (isProjectFile && imageMatch && imageMatch.length > 0) {
                 const match = imageMarkerRegex.exec(imageMatch[0]); 
                 imageMarkerRegex.lastIndex = 0; 
                 
                 if (match) {
                     const imgType = match[1].toUpperCase();
                     const base64Data = match[2];
                     const dataUrl = `data:image/${imgType.toLowerCase()};base64,${base64Data}`;
                     
                     const imgWidth = 150; 
                     const imgHeight = 100;
                     
                     if (yPos + imgHeight + lineHeight_Normal > pageHeight - margin) {
                         addNewPage();
                     }
                     
                     try {
                          const xOffset = (pageWidth - imgWidth) / 2;
                          doc.addImage(dataUrl, imgType, xOffset, yPos, imgWidth, imgHeight);
                          yPos += imgHeight + lineHeight_Normal;
                     } catch (imgError) {
                         doc.text(`[Image Error: Failed to embed ${imgType}]`, margin, yPos);
                         yPos += lineHeight_Normal * 2;
                     }
                     continue; 
                 }
            }

            // F. Text Wrapping and Rendering
            doc.setFont(undefined, fontStyle);
            doc.setFontSize(currentFontSize);
            const wrappedLines = doc.splitTextToSize(printContent, maxWidth);

            for (const wrappedLine of wrappedLines) {
                if (yPos + currentLineHeight > pageHeight - margin) {
                    addNewPage();
                }

                doc.text(wrappedLine, margin, yPos);
                yPos += currentLineHeight;
            }
            
            if (h1Match || h2Match || h3Match) {
                 yPos += lineHeight_Normal / 2;
            }
            doc.setFont(undefined, 'normal'); 
        }
        
        // Add footer to the last page (only if there is content)
        if (pageNumber > 1 || contentBlocks.length > 0) {
            addFooter(pageNumber); 
        }
        
        doc.save(`${filename}.pdf`);

        showToast('PDF exported successfully!', 'success');
        addXP(10, 'Exported to PDF');
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error exporting to PDF.', 'error');
    }
}
  

/**
 * Exports text content to a DOCX (Word) file using a simple Blob download.
 * @param {string} content The text content to export.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToDOCX(content, filename) {
    try {
        // Simple HTML/MHT structure wrapped in a DOC file type
        const contentHtml = `<html><head><meta charset="utf-8"></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
        
        // Use a Blob to create a downloadable file with the correct MIME type
        const blob = new Blob(['\ufeff', contentHtml], { type: 'application/msword' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.doc`; 

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('DOCX (simplified .doc) exported successfully!', 'success');
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

/**
 * Exports content into a basic EPUB file structure.
 * CRITICAL FIX: Provides minimal EPUB packaging using JSZip.
 * @param {string} content The text content.
 * @param {string} filename The desired filename (without extension).
 */
async function exportContentToEPUB(content, filename) {
    if (typeof JSZip === 'undefined') {
        showToast('EPUB export failed: JSZip library not loaded.', 'error');
        throw new Error('JSZip library required.');
    }
    
    showLoading('Packaging EPUB file...');

    try {
        const zip = new JSZip();
        const baseHtml = `<?xml version='1.0' encoding='utf-8'?><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${filename}</title></head><body>${content.replace(/\n/g, '<p>')}</body></html>`;
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
