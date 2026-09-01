const fs = require('fs');
let code = fs.readFileSync('src/cityMap.ts', 'utf8');

// The faulty code is:
/*
        let bType: Building['type'] = 'office';
        let bColor = '#0f172a';
        let bRoof = '#1e293b';
        let bAccent = '#38bdf8';

        if (isHospital) {
          bColor = '#f8fafc';
*/

// Let's replace it to properly set the types!
code = code.replace(
  "        if (isHospital) {",
  "        if (isPoliceStation) bType = 'police_station';\n        if (isHospital) {\n          bType = 'hospital';"
);
code = code.replace(
  "        } else if (isFireStation) {",
  "        } else if (isFireStation) {\n          bType = 'fire_station';"
);

fs.writeFileSync('src/cityMap.ts', code);
