const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  "if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = true;",
  "if (code === 'ShiftLeft') inputRef.current.shiftUp = true;\n      if (code === 'ControlLeft') inputRef.current.shiftDown = true;\n      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = true;"
);
code = code.replace(
  "if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;",
  "if (code === 'ShiftLeft') inputRef.current.shiftUp = false;\n      if (code === 'ControlLeft') inputRef.current.shiftDown = false;\n      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;"
);
fs.writeFileSync('src/App.tsx', code);
