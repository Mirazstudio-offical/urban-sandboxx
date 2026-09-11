const fs = require('fs');

let content = fs.readFileSync('src/components/CarDealershipModal.tsx', 'utf8');

content = content.replace(
  /name: 'ВАЗ-2107 «Жигули»',\s*nameRu: 'ВАЗ-2107 «Жигули»',\s*brand: 'LADA'/g,
  "name: 'Классический седан',\n    nameRu: 'Классический седан',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'ВАЗ-2109 «Самара»',\s*nameRu: 'ВАЗ-2109 «Самара»',\s*brand: 'LADA'/g,
  "name: 'Хэтчбек',\n    nameRu: 'Хэтчбек',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'LADA Priora',\s*nameRu: 'LADA Priora',\s*brand: 'LADA'/g,
  "name: 'Седан',\n    nameRu: 'Седан',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'BMW 5 Series \(E39\)',\s*nameRu: 'BMW 5 серии \(E39\)',\s*brand: 'BMW'/g,
  "name: 'Бизнес-седан',\n    nameRu: 'Бизнес-седан',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'LADA Niva Legend',\s*nameRu: 'LADA Niva Legend 4x4',\s*brand: 'LADA'/g,
  "name: 'Внедорожник',\n    nameRu: 'Внедорожник',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'Nissan Skyline GT-R \(R34\)',\s*nameRu: 'Nissan Skyline GT-R \(R34\)',\s*brand: 'Nissan'/g,
  "name: 'Спорткар',\n    nameRu: 'Спорткар',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'Toyota Hilux',\s*nameRu: 'Toyota Hilux',\s*brand: 'Toyota'/g,
  "name: 'Пикап',\n    nameRu: 'Пикап',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'УАЗ-452 «Буханка»',\s*nameRu: 'УАЗ-452 «Буханка»',\s*brand: 'УАЗ'/g,
  "name: 'Старый фургон',\n    nameRu: 'Старый фургон',\n    brand: 'Автомобиль'"
);

content = content.replace(
  /name: 'ВАЗ-1111 «Ока»',\s*nameRu: 'ВАЗ-1111 «Ока»',\s*brand: 'СеАЗ \/ КАМАЗ'/g,
  "name: 'Микрокар',\n    nameRu: 'Микрокар',\n    brand: 'Автомобиль'"
);

fs.writeFileSync('src/components/CarDealershipModal.tsx', content);
