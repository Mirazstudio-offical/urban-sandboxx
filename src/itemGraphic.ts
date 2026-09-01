// Procedural 2D Canvas Models for all Items & Trash in the Game
export function drawItemModel2D(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  centerX: number = 0,
  centerY: number = 0,
  size: number = 24
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const scale = size / 24;
  ctx.scale(scale, scale);

  switch (itemId) {
    case 'water_bottle': {
      // Bottle shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(1, 9, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main bottle body (Translucent Cyan/Blue)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 14, [2, 2, 4, 4]);
      ctx.fill();

      // Water liquid fill
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4.5, -2, 9, 9.5);

      // White paper label
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-5, -2, 10, 5);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-3, -1, 6, 1);

      // Bottle neck & Blue Cap
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-2.5, -9, 5, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -11, 6, 2.5);

      // Glass highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-3.5, -5, 2, 11);
      break;
    }

    case 'soda_can': {
      // Red Aluminum Can
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(1, 8, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Can body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 15, [3, 3, 3, 3]);
      ctx.fill();

      // White Cola Wave
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.bezierCurveTo(-2, -5, 2, 1, 5, -2);
      ctx.lineTo(5, 1);
      ctx.bezierCurveTo(2, 4, -2, -2, -5, 1);
      ctx.closePath();
      ctx.fill();

      // Silver top & bottom rims
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -8, 3.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Metallic highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-3.5, -7, 1.5, 13);
      break;
    }

    case 'hot_coffee': {
      // White Paper Coffee Cup
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(1, 9, 6, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cup main taper
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-5.5, -7);
      ctx.lineTo(5.5, -7);
      ctx.lineTo(4, 8);
      ctx.lineTo(-4, 8);
      ctx.closePath();
      ctx.fill();

      // Corrugated Brown heat sleeve
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.lineTo(4.3, 3);
      ctx.lineTo(-4.3, 3);
      ctx.closePath();
      ctx.fill();

      // Coffee bean logo
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2, 2.8, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Black coffee lid
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-6, -10, 12, 3.5, [1, 1, 0, 0]);
      ctx.fill();
      break;
    }

    case 'energy_drink': {
      // Turbo Energy Drink (Dark blue & yellow lightning)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(1, 9, 4.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(-4.5, -9, 9, 17, [2, 2, 2, 2]);
      ctx.fill();

      // Bright yellow lightning bolt
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(1, -6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 6);
      ctx.lineTo(3, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();

      // Silver top
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(0, -9, 4.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'fresh_juice': {
      // Orange Juice Box / Cup
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-5, -7, 10, 14, [2, 2, 2, 2]);
      ctx.fill();

      // Citrus orange slice graphic
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Green Straw
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(1, -7);
      ctx.lineTo(4, -11);
      ctx.stroke();
      break;
    }

    case 'sandwich': {
      // Toasted Triangle Sandwich
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Green lettuce layer
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 2, 8, Math.PI, Math.PI * 2);
      ctx.fill();

      // Pink ham layer
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-7, 0, 14, 2.5);

      // Yellow cheese triangle
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-8, -1);
      ctx.lineTo(8, -1);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();

      // Toasted bread slice
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-6.5, -5);
      ctx.lineTo(6.5, -5);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'burger': {
      // Juicy Cheeseburger
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bottom bun
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-7, 3, 14, 4, 2);
      ctx.fill();

      // Patty
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-8, 1, 16, 3, 1);
      ctx.fill();

      // Melted Cheese
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-7, 1);
      ctx.lineTo(7, 1);
      ctx.lineTo(5, 4);
      ctx.lineTo(-3, 2);
      ctx.closePath();
      ctx.fill();

      // Green Lettuce
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-3, -1, 3, 0, Math.PI * 2);
      ctx.arc(3, -1, 3, 0, Math.PI * 2);
      ctx.fill();

      // Top Sesame Bun
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -1, 7.5, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, -1, 6.5, Math.PI, Math.PI * 2);
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -5, 1, 1.5);
      ctx.fillRect(2, -6, 1, 1.5);
      ctx.fillRect(0, -3, 1, 1.5);
      break;
    }

    case 'pizza_slice': {
      // Pepperoni Pizza Slice
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden crust crust
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -6, 8, -Math.PI * 0.25, Math.PI * 1.25);
      ctx.fill();

      // Melted Yellow Cheese Triangle
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(7, -5);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();

      // Red Pepperoni slices
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-2, -2, 2.2, 0, Math.PI * 2);
      ctx.arc(2, 1, 2, 0, Math.PI * 2);
      ctx.arc(0, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'apple': {
      // Crisp Red Apple
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Apple Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-2.5, 0, 5, 0, Math.PI * 2);
      ctx.arc(2.5, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Glossy highlight
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Stem & Leaf
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(1, -8);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(3, -7, 3, 1.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'chocolate': {
      // Dark Chocolate Bar
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Silver Foil Wrapper
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-7, -4, 14, 11);

      // Red sleeve wrapper
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-7, -1, 14, 8);

      // Dark Chocolate Blocks peeking top
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-6, -8, 12, 5);
      ctx.strokeStyle = '#290e02';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-6, -8, 6, 5);
      ctx.strokeRect(0, -8, 6, 5);
      break;
    }

    case 'chips': {
      // Potato Chips Bag
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-6, -8, 12, 16, [2, 2, 2, 2]);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -2, 12, 5);

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'canned_meat': {
      // Canned Beef Stew Tin
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -6, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(-6, -6, 12, 11);

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 5, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red/Gold Military Label
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-4, -1, 8, 2);
      break;
    }

    case 'medkit': {
      // First Aid Kit
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red Box Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-8, -6, 16, 12, [3, 3, 3, 3]);
      ctx.fill();

      // White Medical Cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -4, 4, 8);
      ctx.fillRect(-5, -1, 10, 2);

      // Handle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, -8, 6, 2);
      break;
    }

    case 'bandage': {
      // Sterile Gauze Bandage Roll
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Blue cross line
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-1, -3, 2, 6);
      ctx.fillRect(-3, -1, 6, 2);
      break;
    }

    case 'painkillers':
    case 'vitamins': {
      // Medicine Bottle
      ctx.fillStyle = itemId === 'vitamins' ? '#d97706' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 13, [2, 2, 2, 2]);
      ctx.fill();

      // Blue Label
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-5, -2, 10, 5);

      // Cap
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -9, 8, 3);
      break;
    }

    case 'cash': {
      // Stack of Banknotes
      ctx.fillStyle = '#166534';
      ctx.fillRect(-7, -4, 14, 9);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-6, -5, 14, 9);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(-5, -6, 14, 9);

      // White paper strap
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -6, 4, 9);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, -3, 2, 3);
      break;
    }

    case 'repair_kit': {
      // Metal Toolbox
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 12, [2, 2, 2, 2]);
      ctx.fill();

      // Metal rim & latches
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-9, -1, 18, 2);
      ctx.fillRect(-5, -2, 2, 4);
      ctx.fillRect(3, -2, 2, 4);

      // Top handle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -8, 8, 2);
      break;
    }

    case 'flashlight': {
      // LED Tactical Flashlight
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -8, 6, 14);

      // Grip ridges
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, -4, 6, 2);
      ctx.fillRect(-3, 0, 6, 2);

      // Bezel
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-4.5, -8);
      ctx.lineTo(4.5, -8);
      ctx.lineTo(3, -5);
      ctx.lineTo(-3, -5);
      ctx.closePath();
      ctx.fill();

      // Glowing lens
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, -8, 4.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'antiseptic': {
      // Small translucent medical bottle with white pump cap
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Green bottle body
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(-4.5, -6, 9, 12, [2, 2, 2, 2]);
      ctx.fill();

      // White cross label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -2, 9, 4);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-0.8, -1.5, 1.6, 3);
      ctx.fillRect(-2, -0.4, 4, 0.8);

      // Bottle neck & spray/pump top
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-1.5, -9, 3, 3);
      ctx.fillRect(-3, -11, 4, 2);
      break;
    }

    case 'motor_oil': {
      // Yellow plastic motor oil jug with side handle
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow jug body
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 14, [2, 2, 2, 2]);
      ctx.fill();

      // Side handle (hole cutout)
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(2.5, -5, 2, 10);
      ctx.fillStyle = '#000000'; // Mask to look like background cutout or darker shade
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(1.5, -4, 2.5, 8, 1);
      ctx.fill();

      // Black Cap
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3.5, -9, 5, 2);

      // Red label with oil drop
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5, -2, 6, 6);
      ctx.fillStyle = '#dc2626'; // Oil droplet
      ctx.beginPath();
      ctx.arc(-2, 2, 1.5, 0, Math.PI);
      ctx.lineTo(-2, -0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'car_battery': {
      // Heavy car battery block with red/blue terminals
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Battery main casing (dark gray/black)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 13, [1, 1, 1, 1]);
      ctx.fill();

      // Top ridge
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-9, -6, 18, 2.5);

      // Terminals (Left red/positive, Right blue/negative)
      ctx.fillStyle = '#ef4444'; // Red (+)
      ctx.fillRect(-6, -8, 2, 2);
      ctx.fillStyle = '#2563eb'; // Blue (-)
      ctx.fillRect(4, -8, 2, 2);

      // Spark/⚡ logo on front
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(-2, 1);
      ctx.lineTo(0.5, 1);
      ctx.lineTo(-1, 5);
      ctx.lineTo(2.5, 0.5);
      ctx.lineTo(0, 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'extinguisher': {
      // Red cylindrical extinguisher tank
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 9, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-4.5, -7, 9, 15, [3, 3, 3, 3]);
      ctx.fill();

      // Silver collar and pressure nozzle
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, -9, 4, 2);
      ctx.fillStyle = '#1e293b'; // Handle trigger
      ctx.fillRect(-3, -11, 4, 1.8);
      ctx.fillRect(-1, -12, 3, 1);

      // Black hose running down
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(1.5, -9);
      ctx.bezierCurveTo(4, -6, 4, 0, 2, 4);
      ctx.stroke();

      // White label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -2, 9, 5);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, -1, 6, 0.8);
      ctx.fillRect(-3, 1, 6, 0.8);
      break;
    }

    case 'cappuccino': {
      // Creamy espresso paper cup
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(1, 9, 5.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cup body (brown theme)
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.moveTo(-5, -6);
      ctx.lineTo(5, -6);
      ctx.lineTo(3.5, 8);
      ctx.lineTo(-3.5, 8);
      ctx.closePath();
      ctx.fill();

      // White cream top overflowing slightly
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(0, -6, 5.2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-2, -7, 1.8, 0, Math.PI * 2);
      ctx.arc(2, -7, 1.8, 0, Math.PI * 2);
      ctx.arc(0, -8, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Heat sleeve
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-4.6, -2);
      ctx.lineTo(4.6, -2);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'croissant': {
      // Golden pastry crescent
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 8, 2.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706'; // Rich crust
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flaky segment lines
      ctx.fillStyle = '#f59e0b'; // Light pastry fluff
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.lineTo(-4, 2);
      ctx.moveTo(-2, -3.5); ctx.lineTo(-1.5, 3.5);
      ctx.moveTo(1.5, -3.5); ctx.lineTo(1, 3.5);
      ctx.moveTo(4.5, -2.5); ctx.lineTo(3.5, 2.5);
      ctx.stroke();
      break;
    }

    case 'soup': {
      // Soup bowl with green specs
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bowl body (red ceramic)
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.ellipse(0, 1, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8, -3, 16, 4.5);

      // Yellow chicken broth
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, -3, 7.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Green parsley flakes
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-3, -3, 1, 1);
      ctx.fillRect(2, -4, 1, 1);
      ctx.fillRect(-1, -2, 1, 1);
      ctx.fillRect(3, -2, 1, 1);
      break;
    }

    case 'pocket_knife': {
      // Pocket knife with half-open metallic blade
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red handles / grip
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-7, -2, 14, 4, 2);
      ctx.fill();

      // Metal blade pivoting out
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-5, -1);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-4, -8);
      ctx.lineTo(-3, -1);
      ctx.closePath();
      ctx.fill();

      // Knife pivot screw
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(-5, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'thermal_coat': {
      // Warm bulky winter coat
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bulky blue coat body
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-8, -8, 16, 15, [3, 3, 1, 1]);
      ctx.fill();

      // Zipper line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 7);
      ctx.stroke();

      // Fuzzy brown fur hood trim
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(0, -9, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(0, -9, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'duct_tape': {
      // Roll of gray heavy duty tape
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outermost gray roll
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cardboard brown inner core ring
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.8, 2.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black hollow center hole
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'trash':
    case 'litter_trash': {
      // Recyclable Street Waste / Trash
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crushed soda tin
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 5, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Crumpled paper
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(3, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Fallback clean box
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -3, 6, 6);
      break;
    }
  }

  ctx.restore();
}
