const fs = require("fs");
const path = require("node:path");
const pdfparse = require("pdf-parse");
const { parseInvoice } = require("./parseInvoice");

// Argument aus der Kommandozeile holen
const filePath = process.argv[2];

main();



async function main() {
    await checkFile(); // existiert die Datei?
    const txt = await parseContent(filePath); // extrahiere den Text
    const data = await extractTextData(txt); // suche nach den wichtigen Infos


    console.log("------------------------------------------------------ \n JSON : \n ------------------------------------------------------");


    console.log(data);// zeige JSON auf der Konsole an
}

async function extractTextData(text) {
  try {
    const result = await parseInvoice(text);
    return result;

  } catch (err) {
    console.error("Fehler:", err);
  }
};


async function checkFile() {

    if (!filePath) {
        console.error("Fehler: Bitte gib einen Dateipfad an.");
        console.error("Benutzung: node src/index.js <DATEIPFAD>");
        process.exit(1);
    }
    
    // Prüfen, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
        console.error(`Fehler: Die Datei "${filePath}" existiert nicht.`);
        process.exit(1);
    }
}



async function parseContent(filePath) {
    // Prüfen, ob es sich um .txt oder .pdf handelt
    if (path.extname(filePath) == ".txt") { //ist eine .txt Datei

        try { // Dateiinhalt lesen
            txt = fs.readFileSync(filePath, "utf-8"); 
            return txt;
        } catch (error) {
            console.error("Fehler beim Lesen der .txt Datei:", error.message);
        }

    }  else if (path.extname(filePath) == ".pdf") { //ist eine .pdf Datei

        try {// Dateiinhalt lesen
            let pdf = fs.readFileSync(filePath);
            let data = await pdfparse(pdf); 
            return data.text; 
        
        } catch (error) {
            console.error("Fehler beim Lesen der .pdf Datei:", error.message);
        }
            
    } else {
        console.error("Datei muss im .txt oder .pdf Format sein");
    }
}