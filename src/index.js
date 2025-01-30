const fs = require("fs");
const path = require("node:path");
const pdfparse = require("pdf-parse");

// Argument aus der Kommandozeile holen
const filePath = process.argv[2];

main();



async function main() {
    await checkFile(); // existiert die Datei?
    const txt = await parseContent(filePath); // extrahiere den Text
    const data = await searchForInfo(txt); // suche nach den wichtigen Infos
    const returnJson = await toJson(data); // konvertiere Infos in JSON-Format
    console.log(returnJson); // zeige JSON auf der Konsole an
}

async function toJson(infos) {

    let data = {
        rechnungs_nr: infos[0],
        rechnungs_datum: infos[1],
        gesamt_betrag_brutto: infos[2],
        gesamt_betrag_netto: infos[3]
      }

      return data;
}




async function searchForInfo(text) {
    let rechnungs_Nummer = "hi";
    let rechnungs_Datum = "12.12.12";
    let betrag_Brutto = 100;
    let betrag_Netto = 80;
    return [rechnungs_Nummer, rechnungs_Datum, betrag_Brutto, betrag_Netto];
}


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