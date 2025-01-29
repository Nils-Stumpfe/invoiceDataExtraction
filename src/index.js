const { readFile, readFileSync } = require ("fs");
const txt = readFileSync("./test_files/Rechnung_Level_0.txt", "utf8");


console.log(txt)