const fs = require("fs");
const path = require("node:path");
const pdfparse = require("pdf-parse");

// Argument aus der Kommandozeile holen
const filePath = process.argv[2];

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

// Prüfen, ob es sich um .txt oder .pdf handelt
if (path.extname(filePath) == ".txt") { //ist eine .txt Datei

    try {
        // Dateiinhalt lesen
        const txt = fs.readFileSync(filePath, "utf-8"); 

        console.log(txt);

    } catch (error) {
        console.error("Fehler beim Lesen der .txt Datei:", error.message);
    }

}  else if (path.extname(filePath) == ".pdf") { //ist eine .pdf Datei

    try {
        // Dateiinhalt lesen
        const pdf = fs.readFileSync(filePath);
    
        pdfparse(pdf).then(function (data) {
            console.log(data.text);
        })
    
    
    } catch (error) {
        console.error("Fehler beim Lesen der .pdf Datei:", error.message);
    }
        

} else {
    console.error("Datei muss im .txt oder .pdf Format sein");
}