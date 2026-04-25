import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Generate a multi-page PDF from ELD log pages.
 * Each .pdf-export-page div becomes one page in the PDF.
 */
export async function generateELDPDF(containerSelector: string, filename: string): Promise<void> {
  const container = document.querySelector(containerSelector)
  if (!container) {
    throw new Error('PDF container not found')
  }

  const pages = container.querySelectorAll('.pdf-export-page')
  if (pages.length === 0) {
    throw new Error('No pages to export')
  }

  // Initialize PDF (US Letter Landscape: 11" × 8.5")
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement

    try {
      // Allow layout to settle before capturing
      await new Promise((resolve) => requestAnimationFrame(resolve))

      // Capture page to canvas
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: page.offsetWidth,
        height: page.offsetHeight,
      })

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png')

      // Add image to PDF page
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

      // Add new page if not last
      if (i < pages.length - 1) {
        pdf.addPage()
      }
    } catch (error) {
      console.error(`Failed to capture page ${i + 1}:`, error)
      throw new Error(`Failed to generate PDF page ${i + 1}`)
    }
  }

  // Save PDF
  pdf.save(filename)
}
