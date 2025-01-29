const { readFile, readFileSync } = require ("fs");
const txt = readFileSync("./test_files/Rechnung_Level_0.txt", "utf8");

if (process.argv.length === 2) {
    console.error('Expected PATH_TO_PDF as an argument!');
    process.exit(1);
  }



 console.log(txt)