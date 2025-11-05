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

// fileApi.js (REPLACE exportContentToPDF function)

/**
 * Exports text content to a PDF file using jsPDF, now handling page breaks, numbering, and image embedding for project files.
 * @param {string} content The text content to export.
 * @param {string} filename The desired filename (without extension).
 * @param {boolean} isProjectFile Flag to enable custom formatting (TOC, page breaks, images).
 */
function exportContentToPDF(content, filename, isProjectFile = false) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        showToast('Error: jsPDF library not loaded for PDF export.', 'error');
        return;
    }

    try {
        const doc = new window.jspdf.jsPDF();
        let yPos = 10; // Starting Y position
        let pageNumber = 1;
        const margin = 10;
        const pageHeight = doc.internal.pageSize.height;
        const lineHeight = 5; // Fixed line height for simple calculation
        const maxWidth = 190;
        const fontSize = 12;

        doc.setFontSize(fontSize);

        // Function to add a footer
        const addFooter = (pageNo) => {
            const footerText = isProjectFile ? `Page ${pageNo}` : `Exported by Study Hub | Page ${pageNo}`;
            doc.setFontSize(10);
            doc.text(footerText, doc.internal.pageSize.width - margin, pageHeight - 5, { align: 'right' });
            doc.setFontSize(fontSize); // Reset font size
        };
        
        // Function to manage page breaks and content
        const addNewPage = () => {
            if (pageNumber > 0) {
                 addFooter(pageNumber); // Add footer to the finished page
            }
            doc.addPage();
            pageNumber++;
            yPos = margin; // Reset Y position
        };

        const contentBlocks = content.split('\n'); // Split by newline for simple text rendering
        
        // Image marker pattern: <<<IMAGE_type_base64>>>
        const imageMarkerRegex = /<<<IMAGE_(\w+)_([A-Za-z0-9+/=]+)>>>/;

        for (const block of contentBlocks) {
            let currentLine = block;

            // 1. Check for page break marker
            if (isProjectFile && currentLine.includes('<<<PAGEBREAK>>>')) {
                addNewPage();
                continue;
            }

            // 2. Check for image marker
            const imageMatch = currentLine.match(imageMarkerRegex);
            if (isProjectFile && imageMatch) {
                // If the entire block is an image marker, process it
                if (currentLine.trim() === imageMatch[0]) {
                    const imgType = imageMatch[1].toUpperCase();
                    const base64Data = imageMatch[2];
                    const dataUrl = `data:image/${imgType.toLowerCase()};base64,${base64Data}`;
                    
                    // Estimate image size (assume 80% width for layout)
                    const imgWidth = 150; 
                    const imgHeight = 100; // Fixed size estimate for placement
                    
                    if (yPos + imgHeight + lineHeight > pageHeight - margin) {
                        addNewPage();
                    }
                    
                    try {
                         doc.addImage(dataUrl, imgType, margin + 20, yPos, imgWidth, imgHeight);
                         yPos += imgHeight + lineHeight; // Advance position past the image
                    } catch (imgError) {
                        console.error("jsPDF Image Embedding Failed:", imgError);
                        // Fallback: print a text error
                        doc.text(`[Error: Failed to embed image of type ${imgType}]`, margin, yPos);
                        yPos += lineHeight * 2;
                    }
                    continue; // Done with this block
                }
            }

            // 3. Process text lines (word wrap)
            const wrappedLines = doc.splitTextToSize(currentLine, maxWidth);

            for (const wrappedLine of wrappedLines) {
                if (yPos + lineHeight > pageHeight - margin) {
                    addNewPage();
                }

                doc.text(wrappedLine, margin, yPos);
                yPos += lineHeight;
            }
        }
        
        // Add footer to the last page
        addFooter(pageNumber);

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
