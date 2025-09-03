import { Contact } from './types';

// VCF PARSER
export const parseVCF = (vcfContent: string): Contact[] => {
    const contacts: Contact[] = [];
    // Normalize line endings and split into individual VCard sections
    const vcards = vcfContent.replace(/\r\n/g, '\n').split('BEGIN:VCARD');

    for (const vcard of vcards) {
        if (vcard.trim() === '') continue;

        const unfolded = vcard.replace(/\n /g, ''); // Unfold lines
        const lines = unfolded.split('\n');
        
        const contact: Partial<Contact> & { id?: string } = {
            tels: [],
            emails: [],
        };

        let currentPhotoData = '';
        let isReadingPhoto = false;

        for (const line of lines) {
            const [key, ...valueParts] = line.split(/:|;/);
            let value = valueParts.join(':');

            // Handle cases like "item1.EMAIL;TYPE=INTERNET:user@example.com"
            const lastPart = line.substring(line.indexOf(':') + 1);
            if (lastPart) {
                value = lastPart;
            }


            if (isReadingPhoto) {
                if (line.includes(':') || line.includes(';')) {
                    isReadingPhoto = false;
                     // Continue with normal parsing for the new line
                } else {
                    currentPhotoData += line.trim();
                    continue;
                }
            }

            if (key.startsWith('FN')) contact.fn = value;
            if (key.startsWith('TITLE')) contact.title = value;
            if (key.startsWith('ORG')) contact.org = value;
            if (key.startsWith('NOTE')) contact.note = value.replace(/\\n/g, '\n');
            
            if (key.startsWith('TEL')) {
                const typeMatch = key.match(/TYPE=([^;:]+)/);
                contact.tels.push({ type: typeMatch ? typeMatch[1].toUpperCase() : 'VOICE', value: value });
            }
            if (key.startsWith('EMAIL')) {
                const typeMatch = key.match(/TYPE=([^;:]+)/);
                contact.emails.push({ type: typeMatch ? typeMatch[1].toUpperCase() : 'INTERNET', value: value });
            }
            if (key.startsWith('PHOTO')) {
                if (key.includes('ENCODING=b') || key.includes('ENCODING=BASE64')) {
                    isReadingPhoto = true;
                    currentPhotoData += value.trim();
                }
            }
            if (line.startsWith('END:VCARD')) {
                 if (contact.fn) {
                    contact.id = `${Date.now()}-${Math.random()}`;
                    if (currentPhotoData) {
                        contact.photo = `data:image/jpeg;base64,${currentPhotoData}`;
                    }
                    contacts.push(contact as Contact);
                }
                currentPhotoData = ''; // Reset for next vcard
            }
        }
    }
    return contacts;
};


// VCF GENERATOR
export const generateVCF = (contacts: Contact[]): string => {
    let vcfString = '';
    contacts.forEach(contact => {
        vcfString += 'BEGIN:VCARD\r\n';
        vcfString += 'VERSION:3.0\r\n';
        vcfString += `FN:${contact.fn}\r\n`;
        if (contact.org) vcfString += `ORG:${contact.org}\r\n`;
        if (contact.title) vcfString += `TITLE:${contact.title}\r\n`;
        contact.tels.forEach(tel => {
            vcfString += `TEL;TYPE=${tel.type || 'VOICE'}:${tel.value}\r\n`;
        });
        contact.emails.forEach(email => {
            vcfString += `EMAIL;TYPE=${email.type || 'INTERNET'}:${email.value}\r\n`;
        });
        if (contact.note) vcfString += `NOTE:${contact.note.replace(/\n/g, '\\n')}\r\n`;
        if (contact.photo) {
            const base64Data = contact.photo.split(',')[1];
            if (base64Data) {
                let foldedData = base64Data.replace(/(.{76})/g, "$1\r\n ");
                vcfString += `PHOTO;ENCODING=b;TYPE=JPEG:${foldedData}\r\n`;
            }
        }
        vcfString += 'END:VCARD\r\n';
    });
    return vcfString;
};
