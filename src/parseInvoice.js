const moment = require("moment");
const chrono = require("chrono-node");

/**
 * Entfernt überflüssige Zeilenumbrüche, Tabs etc..
 */
function preprocessText(rawText) {
    return rawText
      .replace(/[\r\n]+/g, " ")    // Zeilenumbrüche zu Leerzeichen
      .replace(/\s\s+/g, " ")      // Mehrfache Whitespaces reduzieren
      .trim();
}
  
/**
 * Aus einem beliebigen String ein Datum nach dem Muster "DD.MM.YYYY" parsen.
 * Wir suchen NUR nach Schlüsselwörtern wie "Rechnungsdatum", "Date of issue" usw.
 * Fällt sonst kein Datum auf, geben wir `undefined` zurück.
 * 
 * Falls wir mehrere verschiedene Datumsangaben finden, kannst du entscheiden:
 * - Entweder nur das erste nehmen,
 * - oder verifizieren, ob sie identisch sind.
 * Hier: wir nehmen das erste gefundene.
 */
function parseInvoiceDate(text) {
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

/**
 * Nimmt ein rohes Datumsfragment (z.B. "16 Feb 2024", "2024-02-16") und
 * versucht, es in "DD.MM.YYYY" umzuwandeln.
 * npm Moment.js wird hier benutzt.
 */
function normalizeDate(rawDateStr) {
  const DATE_FORMATS = [
    "DD.MM.YYYY",     // 16.02.2024, 29.07.2024
    "MMMM D, YYYY",   // November 8, 2023, Dezember 8, 2023
    "D. MMMM YYYY",    // 21.August 2023
    "D.MMMM YYYY",    // 21. August 2023
    "MMM D, YYYY",    // Jan 8, 2023, January 10, 2023
    "M/D/YYYY",       // 8/23/2023
    "YYYY-MM-DD"      // 2024-02-16
  ];


  // **Versuch 1:** Moment.js mit deutscher Locale
  let parsedDate = moment(rawDateStr, DATE_FORMATS, "de", true);
  
  // Falls ungültig, probiere **englische Locale**
  if (!parsedDate.isValid()) {
    parsedDate = moment(rawDateStr, DATE_FORMATS, "en", true);
  }

  // Falls ein gültiges Datum gefunden wurde, formatiere es
  return parsedDate.isValid() ? parsedDate.format("DD.MM.YYYY") : undefined;
}

/**
 * Extrahiert die Rechnungsnummer aus dem Text.
 * Regeln:
 *  - Stichwörter: "Rechnungsnummer", "Rechnung Nr", "invoice number", ...
 *  - Falls mehrmals verschiedene Rechnungsnummern gefunden -> Warnung & undefined
 *  - Falls keine -> undefined + Warnung
 *  - Falls dieselbe Nr. doppelt -> nutze sie
 */
function parseInvoiceNumber(text) {

  // Mögliche Labels:
  const invoiceNumberLabels = [
    "rechnungsnummer",
    "rechnungsnr",
    "rechnung nr\\.?\\s*",
    "invoice number",
    "invoice",
    "invoice no\\.?\\s*"
    // Weitere einfügen...
  ];

  // Regex, das "Label + (beliebige Zeichen bis Zeilenende / Stop)" abgreift
  // Wir erhoffen uns: "Rechnungsnummer: 202400195"
  // Achtung: In den Beispielen kann was dranhängen -> "RechnungO12341875"
  // => wir suchen z.B. "label ... optional : ... (hier alphanum-Sonderz. bis whitespace/Zeilenende?)
  // Bsp: /(?:rechnungsnummer|invoice number)\s*[:\-]*\s*([\w-]+)/i  -> aber wir müssen sehr flexibel sein.
  
  // Wir sammeln alle Funde in ein Set
  const foundNumbers = new Set();
  
  for (const label of invoiceNumberLabels) {
    // Bei "RechnungO12341875" kann man z.B. so vorgehen:
    //  - Suche z.B. "Rechnungsnummer\s*[:\-]*\s*([\S]+)"

    const pattern = new RegExp(
      label + "\\s*[:\\-]*\\s*([^\\s]+)", 
      "gi");

    let match;
    while ((match = pattern.exec(text)) !== null) {
      // match[1] wäre der Teil nach dem label
      foundNumbers.add(match[1].trim());
    }
  }

  // Nun haben wir ein Set an verschiedenen "Rechnungsnummern"
  if (foundNumbers.size === 0) {
    console.log("WARNUNG: Keine eindeutige Rechnungsnummer gefunden.");
    return undefined;
  }
  if (foundNumbers.size > 1) {
    // Prüfen, ob ALLE identisch sind?
    // Da es ein Set ist, wenn >1, heißt es mind. 2 verschiedene
    // => In den Anforderungen: "Falls mehrere unterschiedliche -> undefined"
    if (foundNumbers.size === 1) {
      // Falls sie im Text nur doppelt identisch war, ist size=1. Dann passt es.
      return [...foundNumbers][0];
    } else {
      console.log("WARNUNG: Mehrere unterschiedliche Rechnungsnummern gefunden:", [...foundNumbers]);
      return undefined;
    }
  }

  // Exakt eine Rechnungsnummer
  return [...foundNumbers][0];
}


/**
 * Sucht im Text nach Währungs-Beträgen, die mit (netto) oder (brutto) bzw. "net"/"gross" usw. markiert sind.
 */
function parseAmounts(text) {

  // Alle möglichen (sehr allgemeinen) Labels, die andeuten, dass es um Netto-Beträge geht
  const netKeywords = [
    "nettobetrag",
    "gesmatbetrag netto",
    "warenwert netto",
    "subtotal",
    "nettosumme",

    "netto",
    "net amount",
    "net total",
    "total",
    "summe netto"
    // ...
  ];

  // Alle möglichen (sehr allgemeinen) Labels, die andeuten, dass es um Brutto-Beträge geht
  const grossKeywords = [
    "bruttobetrag",
    "gesamtbetrag",
    "total",
    "gesamt",

    "brutto",
    "gross amount",
    "gross total",
    "summe brutto"
    // ...
  ];

  // Labels, die uns verraten, dass es sich um einen Gesamtbetrag ohne Netto/Brutto-Kennzeichnung handelt
  const totalKeywords = [
    "amount due",
    "summe",
    // ...
  ];

  // 1) Alle Beträge + Währung aus dem Text fischen.
  const moneyPattern = new RegExp(
    "([€$¥£])?\\s?([0-9]+(?:[\\.,][0-9]+)?)(?:,-)?\\s?([€$¥£])?", "gi"
  );

  let match;
  const foundMoney = [];  // Array mit Objekten { raw, numericValue, currencySymbol, index }
  while ((match = moneyPattern.exec(text)) !== null) {
    const raw = match[0];
    // Ermitteln, welches Symbol "wirklich" die Währung ist:
    let currencySymbol = match[1] || match[3] || "";  // könnte leer sein
    currencySymbol = currencySymbol.trim();

    // numericValue parsen:
    // - Komma durch Punkt ersetzen
    // - Falls es am Ende `,-` gibt, => .00
    // wir haben das unten schon im Pattern erfasst, also match[2]
    let numericStr = match[2]
      .replace(",", ".")   // Komma -> Punkt
      .trim();

    // Falls 3 Nachkommastellen => truncate
    const floatVal = parseFloat(numericStr);
    // Re-Stringify mit 2 Nachkommastellen. 
    // Achtung: Wir wollen NICHT runden, sondern nur abschneiden.
    // => also z.B. "4865.567" -> "4865.56"
    const truncatedVal = truncateToTwoDecimals(floatVal);

    foundMoney.push({
      raw,
      currencySymbol: currencySymbol || undefined,
      numericValue: truncatedVal,
      index: match.index // Position im Text (nützlich für spätere Zuordnung)
    });
  }

  // 2) Prüfen, ob wir mehrere verschiedene Währungen (EUR / USD / GBP / etc.) gefunden haben
  //    Wir priorisieren Euro (Symbol: '€'). 
  //    => Falls wir mind. eine Euro-Zeile haben, ignorieren wir die anderen + loggen Warnung.
  //    => Falls wir keine Euro-Zeile haben, nehmen wir die ERSTE gefundene Währung.
  //    => Falls wir ein unbekanntes Symbol entdecken, logge Warnung und setze Beträge = undefined.
  const recognizedCurrencies = new Set();
  for (const fm of foundMoney) {
    if (fm.currencySymbol) recognizedCurrencies.add(fm.currencySymbol);
  }
  // Filter nur auf anerkannte Währungen
  // (Wir hatten mal "unbekannte Währung => undefined" in den Requirements,
  //  aber du sagtest, wir "loggen unknown" und dann totalAmountNet = totalAmountGross = undefined.)
  const knownSymbols = ["€", "$", "£", "¥"];
  const unknown = [...recognizedCurrencies].filter(s => !knownSymbols.includes(s));

  if (unknown.length > 0) {
    console.log("WARNUNG: Unbekannte Währung(en) gefunden:", unknown);
    // => Dann sind alle Beträge undefined
    return { totalAmountNet: undefined, totalAmountGross: undefined };
  }

  if (recognizedCurrencies.size > 1) {
    // Es gibt mind. 2 verschiedene anerkannte Währungen
    console.log("WARNUNG: Mehrere Währungen entdeckt:", recognizedCurrencies);
    // => Priorisiere '€'
    if (recognizedCurrencies.has("€")) {
      // Filter foundMoney nur auf Euro
      foundMoney.splice(0, foundMoney.length,
        ...foundMoney.filter(f => f.currencySymbol === "€")
      );
    } else {
      // Nimm die erste gefundene Währung
      const firstSym = foundMoney[0]?.currencySymbol;
      foundMoney.splice(0, foundMoney.length,
        ...foundMoney.filter(f => f.currencySymbol === firstSym)
      );
    }
  }

  // 3) Wir haben jetzt nur noch Beträge einer Währung (oder gar keine).
  //    Finde heraus, welche Beträge NETTO, welche BRUTTO, welche TOT.
  //    => Wir scannen den Text rund um den index für net-/gross-Kennungen
  //       oder total-Kennungen.
  //    => Dann sammeln wir "alle Netto-Funde" (nehmen den größten),
  //       "alle Brutto-Funde" (größter), "alle total-Funde" (größter).
  const netMatches = [];
  const grossMatches = [];
  const totalMatches = [];

  // Hilfsfunktion: um Keywords in der Nähe eines Betrags zu entdecken.
  function findContextKeywords(str, index, radius = 50) {
    // schnippel 50 chars vor/nach dem index
    const snippet = str.slice(Math.max(0, index - radius), index + radius).toLowerCase();
    return snippet;
  }

  for (const fm of foundMoney) {
    const snippet = findContextKeywords(text, fm.index);
    
    // case-insensitive Suche in snippet
    const isNet = netKeywords.some(kw => snippet.includes(kw));
    const isGross = grossKeywords.some(kw => snippet.includes(kw));
    const isTotal = totalKeywords.some(kw => snippet.includes(kw));

    if (isNet) {
      netMatches.push(fm.numericValue);
    }
    if (isGross) {
      grossMatches.push(fm.numericValue);
    }
    if (!isNet && !isGross && isTotal) {
      // "nur total" -> Weder explizit netto noch brutto
      // => wir packen es in "totalMatches"
      totalMatches.push(fm.numericValue);
    }
  }

  // 4) Nach Vorgabe:
  //    - Falls wir sowohl Netto- als auch Brutto-Werte finden:
  //         totalAmountNet = größter Netto
  //         totalAmountGross = größter Brutto
  //    - Falls wir KEINE expliziten Netto/Brutto-Werte, aber "total" => 
  //         => totalNet = totalGross = größter total
  //    - Falls wir gar nix passendes finden => "Kein Netto/Brutto-Hinweis"
  //         => totalNet = totalGross = undefined
  //
  //    => Falls es NUR 1 Summe ohne Kennzeichnung -> net=brutto=die Summe

  let totalAmountNet = undefined;
  let totalAmountGross = undefined;

  if (netMatches.length > 0) {
    totalAmountNet = Math.max(...netMatches).toFixed(2);
  }
  if (grossMatches.length > 0) {
    totalAmountGross = Math.max(...grossMatches).toFixed(2);
  }

  if (totalAmountNet !== undefined && totalAmountGross !== undefined) {
    // beide gefunden => das war's
    return { 
      totalAmountNet, 
      totalAmountGross 
    };
  }

  // Falls wir NUR netMatches haben, aber KEIN Brutto
  // => du sagst, wir sollen NICHTS erzwingen. Evtl. existiert ein totalMatches?
  if (totalAmountNet !== undefined && !totalAmountGross) {
    // Schau, ob wir "total" als fallback nehmen
    if (totalMatches.length > 0) {
      totalAmountGross = Math.max(...totalMatches).toFixed(2);
      return { totalAmountNet, totalAmountGross };
    } else {
      // Dann haben wir eben NUR net
      // => Der Requirement: "Hat der Text nicht beide keywords, sondern nur einen Betrag -> weise diesen betrag sowohl netto als brutto zu"
      console.log("WARNUNG: Kein Brutto-Wert gefunden; übernehme Netto in beide Felder.");
      totalAmountGross = totalAmountNet;
      return { 
        totalAmountNet, 
        totalAmountGross 
      };
    }
  }

  // Falls wir NUR grossMatches haben
  if (!totalAmountNet && totalAmountGross !== undefined) {
    if (totalMatches.length > 0) {
      totalAmountNet = Math.max(...totalMatches).toFixed(2);
      return { totalAmountNet, totalAmountGross };
    } else {
      console.log("WARNUNG: Kein Netto-Wert gefunden; übernehme Brutto in beide Felder.");
      totalAmountNet = totalAmountGross;
      return { 
        totalAmountNet, 
        totalAmountGross 
      };
    }
  }

  // Falls BEIDE leer, aber wir haben totalMatches?
  if (!totalAmountNet && !totalAmountGross && totalMatches.length > 0) {
    const val = Math.max(...totalMatches).toFixed(2);
    console.log("WARNUNG: Kein Netto/Brutto-Hinweis gefunden. Setze totalNet=totalGross=", val);
    return {
      totalAmountNet: val,
      totalAmountGross: val
    };
  }

  // Nix gefunden
  console.log("WARNUNG: Keine passenden Beträge (Netto/Brutto/Total) gefunden.");
  return {
    totalAmountNet: undefined,
    totalAmountGross: undefined
  };
}


/**
 * Hilfsfunktion zum Abkappen auf 2 Nachkommastellen ohne mathematisches Runden.
 * Bsp: 123.4567 => "123.45"
 */
function truncateToTwoDecimals(value) {
  if (isNaN(value)) return undefined;
  const s = value.toString();
  const dotPos = s.indexOf(".");
  if (dotPos === -1) {
    // kein Komma => einfach ".00" anhängen
    return s + ".00";
  }
  // s hat Komma ->  abschneiden
  const intPart = s.slice(0, dotPos);
  const decPart = s.slice(dotPos + 1, dotPos + 3);
  return intPart + "." + decPart.padEnd(2, "0");
}


// ============================================================
// 2) Hauptfunktion parseInvoice(text)
// ============================================================

/**
 * Asynchrone Hauptfunktion, die die Daten aus dem Text extrahiert
 * und ein Objekt zurückgibt.
 */
async function parseInvoice(text) {
  // 1) Vorverarbeitung
  const cleanedText = preprocessText(text);

  // 2) Rechnungsdatum bestimmen
  const invoiceDate = parseInvoiceDate(cleanedText);

  // 3) Rechnungsnummer
  const invoiceNumber = parseInvoiceNumber(cleanedText);

  // 4) Netto/Brutto-Beträge
  const { totalAmountNet, totalAmountGross } = parseAmounts(cleanedText);

  
  // 5) Ergebnis-Objekt konstruieren
  return {
    invoiceNumber,
    invoiceDate,          // z.B. "16.02.2024"
    totalAmountNet,       // z.B. "4865.00"
    totalAmountGross,     // z.B. "4165.00"
  };
}

// ============================================================
// 3) Export der Hauptfunktion
// ============================================================

// Falls du Node.js CommonJS verwendest:
module.exports = { parseInvoice };

// Falls du ESM nutzen willst, dann stattdessen:
// export { parseInvoice };
