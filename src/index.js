const { readFileSync, existsSync } = require("fs");

// Argument aus der Kommandozeile holen
const filePath = process.argv[2];

if (!filePath) {
    console.error("Fehler: Bitte gib einen Dateipfad an.");
    console.error("Benutzung: node src/index.js <DATEIPFAD>");
    process.exit(1);
}

// Prüfen, ob die Datei existiert
if (!existsSync(filePath)) {
    console.error(`Fehler: Die Datei "${filePath}" existiert nicht.`);
    process.exit(1);
}

try {
    // Dateiinhalt lesen
    const txt = readFileSync(filePath, "utf-8"); // "utf-8" sorgt für die richtige Codierung
    console.log("Datei erfolgreich gelesen:\n", txt);
} catch (error) {
    console.error("Fehler beim Lesen der Datei:", error.message);
}