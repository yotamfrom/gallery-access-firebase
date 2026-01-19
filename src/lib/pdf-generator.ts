import jsPDF from 'jspdf';
import { Artwork } from '@/types/gallery';
import { robustFetch } from './utils';
import { saveAs } from '@/lib/utils';

export class PdfGenerator {
    private doc: jsPDF;
    private readonly PAGE_WIDTH = 210; // A4 width in mm
    private readonly PAGE_HEIGHT = 297; // A4 height in mm
    private readonly MARGIN_X = 20;
    private readonly MARGIN_TOP = 15;
    private readonly MARGIN_BOTTOM = 20;
    private readonly CONTENT_WIDTH = 170; // 210 - 20 - 20

    constructor() {
        this.doc = new jsPDF();
    }

    public async generateArtworkPdf(artwork: Artwork, imageUrl: string | null): Promise<void> {
        console.log(`[PdfGenerator] Generating PDF for artwork: ${artwork.work_name}`);
        this.addHeader();
        await this.renderArtworkPage(artwork, imageUrl);
        this.addFooter();

        const filename = `${artwork.work_name}_tearsheet.pdf`;
        await this.saveDoc(filename);
    }

    public async generateCollectionPdf(collectionName: string, artworks: { artwork: Artwork, imageUrl: string | null }[]) {
        console.log(`[PdfGenerator] Generating PDF for collection: ${collectionName} (${artworks.length} items)`);

        this.addHeader();

        // Title Page Content
        this.doc.setFont('Arial', 'bold');
        this.doc.setFontSize(16);
        this.doc.setTextColor(0, 0, 0);

        const centerY = this.PAGE_HEIGHT / 2 - 10;
        this.doc.text(collectionName.toUpperCase(), this.PAGE_WIDTH / 2, centerY, { align: 'center', charSpace: 2 });

        this.doc.setFont('Arial', 'normal');
        this.doc.setFontSize(10);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text('Collection Export', this.PAGE_WIDTH / 2, centerY + 10, { align: 'center', charSpace: 1 });

        this.addFooter();

        // Sequential pages
        for (let i = 0; i < artworks.length; i++) {
            const item = artworks[i];
            console.log(`[PdfGenerator] Processing page ${i + 1}/${artworks.length}: ${item.artwork.work_name}`);
            this.doc.addPage();
            this.addHeader();
            await this.renderArtworkPage(item.artwork, item.imageUrl);
            this.addFooter();
        }

        const filename = `${collectionName.replace(/\s+/g, '_')}.pdf`;
        await this.saveDoc(filename);
    }

    private async saveDoc(filename: string) {
        console.log(`[PdfGenerator] Generating blob for: ${filename}`);
        const blob = this.doc.output('blob');
        await saveAs(blob, filename);
    }

    private async renderArtworkPage(artwork: Artwork, imageUrl: string | null) {
        let currentY = this.MARGIN_TOP + 15;

        // Image
        if (imageUrl) {
            try {
                const imgData = await this.getBase64FromUrl(imageUrl);
                const imgProps = this.doc.getImageProperties(imgData);

                // Calculate dimensions - fit within width, max height 180mm
                const maxImgWidth = this.CONTENT_WIDTH;
                const maxImgHeight = 180;

                let imgWidth = maxImgWidth;
                let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                if (imgHeight > maxImgHeight) {
                    imgHeight = maxImgHeight;
                    imgWidth = (imgProps.width * imgHeight) / imgProps.height;
                }

                const x = (this.PAGE_WIDTH - imgWidth) / 2;
                this.doc.addImage(imgData, 'JPEG', x, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 15; // Space after image
            } catch (e) {
                console.error('[PdfGenerator] Image render failed:', e);
                currentY += 100;
            }
        } else {
            currentY += 100; // Space for missing image
        }

        // --- Details (Left Aligned to the margin) ---
        const startX = this.MARGIN_X;

        // Title line: indd_caption_line_1 (Bold Italic)
        this.doc.setFont('Arial', 'bolditalic');
        this.doc.setFontSize(14); // Slightly larger than base
        this.doc.setTextColor(0, 0, 0);
        const titleText = (artwork.indd_caption_line_1 || artwork.work_name).trim();
        this.doc.text(titleText, startX, currentY);

        currentY += 10;

        // Metadata list
        this.doc.setFont('Arial', 'normal');
        this.doc.setFontSize(12); // Base size 12
        this.doc.setTextColor(0, 0, 0);
        const lineSpacing = 7; // Increased spacing for 12pt font

        // Caption Lines 2 and 3
        const captionLines = [
            artwork.indd_caption_line_2,
            artwork.indd_caption_line_3
        ].filter(Boolean) as string[];

        captionLines.forEach(line => {
            const split = this.doc.splitTextToSize(line, this.CONTENT_WIDTH);
            this.doc.text(split, startX, currentY);
            currentY += (split.length * lineSpacing);
        });

        // Edition Info
        if (artwork.edition_info) {
            this.doc.text(artwork.edition_info, startX, currentY);
            currentY += lineSpacing;
        }

        // Price - Bold
        if (artwork.current_edition_price) {
            this.doc.setFont('Arial', 'bold');
            this.doc.text(`€${artwork.current_edition_price.toLocaleString()}`, startX, currentY);
            currentY += lineSpacing;
        }
    }

    private addHeader() {
        const headerY = this.MARGIN_TOP;
        this.doc.setTextColor(150, 150, 150);

        // Artist Name - Left Aligned, Spaced
        this.doc.setFont('Arial', 'bold');
        this.doc.setFontSize(9);
        this.doc.text('S I G A L I T   L A N D A U', this.MARGIN_X, headerY);

        // Date - Right Aligned
        this.doc.setFont('Arial', 'normal');
        this.doc.setFontSize(9);
        const dateStr = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date());
        this.doc.text(dateStr, this.PAGE_WIDTH - this.MARGIN_X, headerY, { align: 'right' });
    }

    private addFooter() {
        const footerY = this.PAGE_HEIGHT - this.MARGIN_BOTTOM;

        // Horizontal Line
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.2);
        this.doc.line(this.MARGIN_X, footerY, this.PAGE_WIDTH - this.MARGIN_X, footerY);

        // URL - Centered, Spaced
        this.doc.setFont('Arial', 'normal');
        this.doc.setFontSize(8);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text('w w w . s i g a l i t l a n d a u . c o m', this.PAGE_WIDTH / 2, footerY + 6, { align: 'center' });
    }

    private async getBase64FromUrl(url: string): Promise<string> {
        console.log(`[PdfGenerator] Fetching image for base64 conversion: ${url}`);

        try {
            const response = await robustFetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error: any) {
            throw new Error(`Failed to fetch image for PDF: ${error.message}`);
        }
    }
}
