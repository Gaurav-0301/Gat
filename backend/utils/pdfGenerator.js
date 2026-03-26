const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const generatePassPDF = async (passData, qrCodeDataURL) => {
    return new Promise((resolve, reject) => {
        try {
            const pdfPath = path.join(__dirname, '../uploads/passes', `${passData.passNumber}.pdf`)

            //ensure directory exists

            const dir = path.dirname(pdfPath)
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true })
            }

            const doc = new PDFDocument({ size: [400, 600]});
            const stream = fs.createWriteStream(pdfPath);

            doc.pipe(stream);

            //add title
            doc.fontSize(20).text('Visitor Pass', { align: 'center' }).moveDown();

            // Pass Number
            doc.fontSize(16).text(`Pass Number: ${passData.passNumber}`, { align: 'center' }).moveDown();
            
            // Visitor photo if available
            if (passData.visitor.photo) {
                const photoPath = path.join(__dirname, '..', passData.visitor.photo);
                if (fs.existsSync(photoPath)) {
                    doc.image(photoPath, 125, 80, { width: 150, height: 150 }).moveDown(7);
                }
            }
            // Visitor details
            doc.fontSize(14).text('Visitor Information:', { underline: true })
            doc.fontSize(10);
            doc.text(`Valid From: ${new Date(passData.validFrom).toLocaleString()}`);
            doc.text(`Valid Until: ${new Date(passData.validUntil).toLocaleString()}`);
            doc.text(`Host: ${passData.host?.name || 'N/A'}`);

            doc.moveDown();


            //QR Code
            if (qrCodeDataURL) {
                const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "");
                const qrBuffer = Buffer.from(base64Data, 'base64');
                doc.image(qrBuffer, 125, 400, { width: 150, height: 150 });
            }
            doc.end();

            stream.on('finish', () => {
                resolve(pdfPath);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generatePassPDF };
