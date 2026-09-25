const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/getVehicleRequiredKeyType\(veh\.type\)/g, "getVehicleRequiredKeyType(veh)");
fs.writeFileSync('src/App.tsx', appCode);

let hudCode = fs.readFileSync('src/components/SpeedometerHUD.tsx', 'utf8');
hudCode = hudCode.replace(/getVehicleRequiredKeyType\(vehicle\.type\)/g, "getVehicleRequiredKeyType(vehicle)");
fs.writeFileSync('src/components/SpeedometerHUD.tsx', hudCode);
console.log("Patched others");
