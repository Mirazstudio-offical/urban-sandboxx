const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const handleToggleWindow = () => {`;
const replace1 = `  const handleToggleEngine = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh || !veh.engineState) return;
    
    if (veh.engineState.engineRunning) {
      veh.engineState.engineRunning = false;
      veh.engineState.engineStalled = false;
      if (!player.notifications) player.notifications = [];
      player.notifications.push({ id: 'eng_off_' + Date.now(), text: 'Двигатель заглушен', color: '#fbbf24', timer: 2.5 });
    } else {
      if (veh.engineState.batteryCharge > 5 && veh.engineState.starterWorking) {
        veh.engineState.engineRunning = true;
        veh.engineState.engineStalled = false;
        veh.engineState.isStalled = false;
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_on_' + Date.now(), text: 'Двигатель запущен', color: '#34d399', timer: 2.5 });
      } else {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_fail_' + Date.now(), text: 'Двигатель не заводится!', color: '#ef4444', timer: 2.5 });
      }
    }
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleWindow = () => {`;

code = code.replace(target1, replace1);

const target2 = `      // Window Open / Close toggle (O key)`;
const replace2 = `      // Engine Toggle (J key)
      if (code === 'KeyJ') {
        handleToggleEngine();
      }

      // Window Open / Close toggle (O key)`;
      
code = code.replace(target2, replace2);

const target3 = `onChangeHeaterMode={handleChangeHeaterMode}`;
const replace3 = `onChangeHeaterMode={handleChangeHeaterMode}\n        onToggleEngine={handleToggleEngine}`;

code = code.replace(target3, replace3);

fs.writeFileSync('src/App.tsx', code);
