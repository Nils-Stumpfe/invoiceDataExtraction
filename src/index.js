const fs = require("fs");
const path = require("node:path");
const pdfparse = require("pdf-parse");

// Argument aus der Kommandozeile holen
const filePath = process.argv[2];

main();



async function main() {
    //await checkFile();
    //const txt = await parseContent(filePath);
    //console.log(txt);
    //searchForInfo(txt);

    const returnJson = toJson("hi", "12.12.12", 100, 80);
    console.log(returnJson);
}

async function toJson(rnNummer, rnDatum, gBrutto, gNetto) {

    let data = {
        rechnungs_nr: rnNummer,
        rechnungs_datum: rnDatum,
        gesamt_betrag_brutto: gBrutto,
        gesamt_betrag_netto: gNetto
      }

      let json = JSON.stringify(data);
      return json;
}




async function searchForInfo(text) {
    let rechnungs_Nummer = undefined;
    let rechnungs_Datum = undefined;
    let betrag_Brutto = undefined;
    let betrag_Netto = undefined;
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