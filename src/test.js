const chrono = require("chrono-node");
const moment = require("moment");

// **Mapping von deutschen auf englische Monatsnamen**
const monthTranslations = {
  "januar": "January",
  "februar": "February",
  "märz": "March",
  "april": "April",
  "mai": "May",
  "juni": "June",
  "juli": "July",
  "august": "August",
  "september": "September",
  "oktober": "October",
  "november": "November",
  "dezember": "December"
};

/**
 * Ersetzt deutsche Monatsnamen durch englische für `chrono-node`
 */
function replaceGermanMonths(text) {
  return text.replace(/\b(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/gi, match => {
    return monthTranslations[match.toLowerCase()] || match;
  });
}

/**
 * Versucht, ein Datum aus einem Text zu extrahieren und in "DD.MM.YYYY" zu formatieren.
 */
function parseInvoiceDate(text) {
  const dateLabels = [
    "rechnungsdatum",
    "rechnungs-/lieferdatum",
    "date of issue",
    "invoice date",
    "datum:",
    "rechnung datum"
  ];

  for (const label of dateLabels) {
    // Erzeuge ein Regex, das nach "Label: <Datum>" sucht
    const pattern = new RegExp(label + "\\s*:?\\s*(.+)", "i"); // Nimmt alles nach dem Label
    const match = pattern.exec(text);
    if (match) {
      let rawDate = match[1].trim();
      rawDate = replaceGermanMonths(rawDate); // Deutsche Monate ersetzen

      const parsedDate = chrono.parseDate(rawDate); // Nutzt NLP für Datumsanalyse
      if (parsedDate) return moment(parsedDate).format("DD.MM.YYYY"); // In unser Format umwandeln
    }
  }

  return undefined;
}

// **Testfälle mit verschiedenen Datumsformaten**
const testDates = [
  "Rechnungsdatum: 16.02.2024",
  "Rechnungs-/Lieferdatum: 29.07.2024",
  "Date of issue: November 8, 2023",
  "Datum: Dezember 8, 2023",
  "Rechnung Datum: Januar 8, 2023",
  "Invoice Date: January 10, 2023",
  "Rechnungsdatum: 8/23/2023",
  "Rechnung Datum: 21. August 2023",
  "Rechnungsdatum: 21.August 2023",
  "Invoice Date: 2024-02-16",
  "Rechnungsdatum: 02/05/2023", // 5. Februar oder 2. Mai? chrono erkennt es intelligent
  "Date of issue: last Monday", // chrono kann auch relative Angaben parsen!
  "Rechnungsdatum: 1 week ago" // Relative Angaben testen
];

// **Testdurchlauf**
console.log("=== TEST DER DATUMSERKENNUNG MIT CHRONO-NODE ===\n");
testDates.forEach(dateText => {
  console.log(`Eingabe: "${dateText}" -> Normalisiert: ${parseInvoiceDate(dateText)}`);
});
