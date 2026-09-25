import React from 'react';
import { X, FileText, ShieldCheck, Award, MapPin, Car, Stamp, CheckCircle2, QrCode, Building2, FileCheck } from 'lucide-react';
import { InventoryItem } from '../types';

interface PropertyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentItem: InventoryItem | null;
}

export const PropertyDocumentModal: React.FC<PropertyDocumentModalProps> = ({
  isOpen,
  onClose,
  documentItem
}) => {
  if (!isOpen || !documentItem) return null;

  const isEgrn = documentItem.itemId === 'property_deed_egrn';
  const isPropertyDkp = documentItem.itemId === 'property_contract_dkp';
  const isTechPass = documentItem.itemId === 'property_tech_passport';
  const isPts = documentItem.itemId === 'car_pts';
  const isSts = documentItem.itemId === 'car_tech_passport';
  const isCarDkp = documentItem.itemId === 'car_contract_dkp';

  // Compute realistic fallback data if fields were created prior to update
  const str = String(documentItem.id || 'doc') + String(documentItem.nameRu || 'item');
  const hash = Array.from(str).reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);

  const ownerName = documentItem.ownerName || 'Смирнов А. И.';
  const purchaseDate = documentItem.purchaseDate || documentItem.registrationDate || '17.09.2026 г.';
  const cadastralNumber = documentItem.cadastralNumber || `77:${(10 + (hash % 80)).toString().padStart(2, '0')}:${((hash * 13) % 900000 + 100000)}:${(hash % 900 + 100)}`;
  const address = documentItem.address || `Сектор 77, ул. Парковая, д. ${(hash % 40) + 1}, кв. ${(hash % 120) + 1}`;
  const areaSqM = documentItem.areaSqM || (28 + (hash % 80));
  const priceRub = documentItem.priceRub || documentItem.carPrice || (4500000 + (hash % 15000000));
  const roomsCount = documentItem.roomsCount || ((hash % 3) + 1);
  const floor = documentItem.floor || `${(hash % 12) + 1} из 16`;
  const sellerName = documentItem.sellerName || (isCarDkp ? 'ООО «Премиум Моторс»' : 'АО «ГлавНедвижимость»');
  const registrationRecord = documentItem.registrationRecord || `77-77/004-${(hash % 900 + 100)}/2026-${(hash % 80 + 10)}`;
  const cadastralValueRub = documentItem.cadastralValueRub || Math.round(priceRub * 0.92);

  // Vehicle specifics
  const letters = ['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'];
  const l1 = letters[hash % 12];
  const l2 = letters[(hash * 3) % 12];
  const l3 = letters[(hash * 7) % 12];
  const numDigits = ((hash * 17) % 900 + 100).toString();

  const rawCarName = documentItem.vehicleName || documentItem.carName || documentItem.nameRu.replace(/^ПТС — |^СТС — |^Договор купли-продажи \(|\)$/g, '') || 'Семейный Седан (C-Класс)';
  const vehicleName = rawCarName;
  const licensePlate = documentItem.licensePlate || `${l1} ${numDigits} ${l2}${l3} 777 FED`;
  const vehicleColor = documentItem.vehicleColor || documentItem.carColor || (hash % 2 === 0 ? 'Серебристый металлик' : 'Чёрный перламутр');
  const vehicleYear = documentItem.vehicleYear || (2014 + (hash % 11));
  const vehiclePowerHp = documentItem.vehiclePowerHp || (87 + (hash % 150));
  const engineDisplacementCc = documentItem.engineDisplacementCc || (1500 + (hash % 1500));
  
  let wmi = 'XTA';
  if (vehicleName.toLowerCase().includes('truck') || vehicleName.toLowerCase().includes('грузовик') || vehicleName.toLowerCase().includes('самосвал')) wmi = 'XTC';
  else if (vehicleName.toLowerCase().includes('van') || vehicleName.toLowerCase().includes('газель')) wmi = 'Z8T';
  else if (vehicleName.toLowerCase().includes('luxury') || vehicleName.toLowerCase().includes('sports')) wmi = 'WBA';

  const vehicleVin = documentItem.vehicleVin || `${wmi}${vehicleName.substring(0,3).toUpperCase().padEnd(3,'0')}${vehicleYear.toString().slice(-2)}0${((hash * 99991) % 9000000 + 1000000)}`;
  const engineNumber = documentItem.engineNumber || `${vehiclePowerHp > 150 ? '21127' : '21126'}-${((hash * 43) % 9000000 + 1000000)}`;
  const bodyNumber = documentItem.bodyNumber || vehicleVin;
  const documentSeries = documentItem.documentSeries || (isPts ? `77 ТР ${((hash * 31) % 900000 + 100000)}` : isSts ? `99 21 ${((hash * 47) % 900000 + 100000)}` : `ДКП-${((hash * 53) % 900000 + 100000)}`);
  const issuingAuthority = documentItem.issuingAuthority || 'Регистрационный Отдел Автоинспекции Сектора 77';

  return (
    <div
      id="property-document-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="property-document-container"
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isEgrn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              isSts ? 'bg-pink-500/10 text-pink-400 border-pink-500/30' :
              isPts ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
              'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isSts || isPts || isCarDkp ? <Car className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-100">{documentItem.nameRu || documentItem.name}</h3>
              <p className="text-[11px] text-zinc-400">
                {isSts || isPts || isCarDkp ? 'Официальный автодокумент Автоинспекции' : 'Официальный документооборот Единого Реестра'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Document Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 select-text relative max-h-[80vh] bg-stone-200">
          
          {/* ==================== 1. СТС (СВИДЕТЕЛЬСТВО О РЕГИСТРАЦИИ ТС) ==================== */}
          {isSts && (
            <div className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100 text-stone-900 border-2 border-pink-300 rounded-xl p-4 sm:p-6 shadow-md relative overflow-hidden font-sans space-y-4">
              {/* Background watermark */}
              <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
                <ShieldCheck className="w-48 h-48 text-pink-900" />
              </div>

              {/* Header */}
              <div className="text-center border-b border-pink-300 pb-3">
                <div className="text-[10px] uppercase font-bold tracking-widest text-rose-800">Федерация Сектора 77</div>
                <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-rose-950 mt-0.5">
                  Свидетельство о регистрации ТС
                </h2>
                <div className="text-[10px] text-rose-700 font-mono">CERTIFICATE OF REGISTRATION</div>
              </div>

              {/* Russian License Plate Visual Badge */}
              <div className="flex justify-center py-1">
                <div className="bg-white border-2 border-stone-900 rounded-md px-4 py-1.5 flex items-center gap-3 shadow-inner font-mono font-black text-lg tracking-wider text-stone-900">
                  <span>{licensePlate.split(' ')[0]} {licensePlate.split(' ')[1]} {licensePlate.split(' ')[2]}</span>
                  <div className="border-l-2 border-stone-900 pl-2 text-center flex flex-col justify-center leading-none">
                    <span className="text-xs">777</span>
                    <span className="text-[8px] font-bold text-blue-700 flex items-center justify-center gap-0.5">
                      <span className="w-2 h-1 bg-white border border-stone-400"></span> FED
                    </span>
                  </div>
                </div>
              </div>

              {/* STS Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-pink-200">
                  <div className="text-[10px] font-semibold text-rose-800 uppercase">1. Марка, модель ТС</div>
                  <div className="font-bold text-stone-900 text-sm">{vehicleName}</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">2. VIN код</div>
                  <div className="font-mono font-bold text-stone-900">{vehicleVin}</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">3. Цвет</div>
                  <div className="font-medium text-stone-900">{vehicleColor}</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">4. Год выпуска</div>
                  <div className="font-mono text-stone-900">{vehicleYear} г.</div>
                </div>

                <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-pink-200">
                  <div className="text-[10px] font-semibold text-rose-800 uppercase">5. Мощность ДВС</div>
                  <div className="font-mono font-bold text-stone-900">{vehiclePowerHp} л.с. ({Math.round(vehiclePowerHp * 0.735)} кВт)</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">6. Рабочий объем</div>
                  <div className="font-mono text-stone-900">{engineDisplacementCc} куб. см</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">7. Кузов / Кабина №</div>
                  <div className="font-mono text-stone-900">{bodyNumber}</div>
                  <div className="text-[10px] font-semibold text-rose-800 uppercase mt-2">8. Разрешенная max масса</div>
                  <div className="font-mono text-stone-900">1850 кг</div>
                </div>
              </div>

              {/* Owner and Issuing Authority */}
              <div className="bg-white/80 p-3 rounded-lg border border-pink-300 space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-pink-100 pb-1">
                  <span className="font-semibold text-rose-900">Собственник:</span>
                  <span className="font-bold text-stone-900 font-mono">{ownerName}</span>
                </div>
                <div className="flex justify-between border-b border-pink-100 pb-1">
                  <span className="font-semibold text-rose-900">Выдано подразделением:</span>
                  <span className="text-stone-800 text-[11px]">{issuingAuthority}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <span className="font-semibold text-rose-900 block text-[10px]">Серия и номер СТС:</span>
                    <span className="font-mono font-bold text-red-700 text-sm tracking-widest">{documentSeries}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block">Дата выдачи:</span>
                    <span className="font-mono font-semibold text-stone-900">{purchaseDate}</span>
                  </div>
                </div>
              </div>

              {/* Blue Rubber Stamp Visual */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-10 h-10 text-stone-700" />
                  <span className="text-[9px] text-stone-500 font-mono">Цифровая подпись Автоинспекции<br/>Валиден в единой базе</span>
                </div>
                <div className="border-2 border-blue-800 rounded-full p-2 w-20 h-20 flex flex-col items-center justify-center text-center text-blue-800 transform -rotate-12 shadow-sm bg-blue-50/30">
                  <ShieldCheck className="w-5 h-5 text-blue-800" />
                  <span className="text-[8px] font-bold uppercase mt-0.5">АВТОИНСПЕКЦИЯ</span>
                  <span className="text-[6px] font-mono">СЕКТОР 77</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. ПТС (ПАСПОРТ ТРАНСПОРТНОГО СРЕДСТВА) ==================== */}
          {isPts && (
            <div className="bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 text-stone-900 border-2 border-sky-300 rounded-xl p-4 sm:p-6 shadow-md relative font-serif space-y-4">
              {/* Header */}
              <div className="text-center border-b border-sky-300 pb-3">
                <div className="text-[10px] uppercase font-bold font-sans tracking-widest text-sky-900">Федерация Сектора 77</div>
                <h2 className="text-lg sm:text-xl font-bold uppercase font-sans tracking-wide text-sky-950 mt-1">
                  Паспорт Транспортного Средства
                </h2>
                <div className="mt-1 font-mono font-bold text-red-700 text-sm tracking-widest">
                  Серия {documentSeries}
                </div>
              </div>

              {/* Specs Table */}
              <div className="space-y-2 text-xs font-sans">
                <div className="bg-white/80 p-3 rounded-lg border border-sky-200 divide-y divide-sky-100">
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">1. Идентификационный номер (VIN):</span>
                    <span className="font-mono font-bold text-stone-900">{vehicleVin}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">2. Марка, модель ТС:</span>
                    <span className="font-bold text-stone-900">{vehicleName}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">3. Категория ТС:</span>
                    <span className="font-mono font-bold text-stone-900">B (Легковые авто)</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">4. Год изготовления ТС:</span>
                    <span className="font-mono text-stone-900">{vehicleYear}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">5. Модель, № двигателя:</span>
                    <span className="font-mono text-stone-900">{engineNumber}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">6. Шасси (рама) №:</span>
                    <span className="font-mono text-stone-500">Отсутствует</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">7. Кузов (кабина, прицеп) №:</span>
                    <span className="font-mono text-stone-900">{bodyNumber}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">8. Цвет кузова:</span>
                    <span className="font-medium text-stone-900">{vehicleColor}</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">9. Мощность двигателя, л.с. (кВт):</span>
                    <span className="font-mono font-bold text-stone-900">{vehiclePowerHp} л.с. ({Math.round(vehiclePowerHp * 0.735)} кВт)</span>
                  </div>
                  <div className="py-1 flex justify-between">
                    <span className="font-semibold text-stone-700">10. Рабочий объем двигателя, куб.см:</span>
                    <span className="font-mono text-stone-900">{engineDisplacementCc}</span>
                  </div>
                </div>

                {/* Owner entry */}
                <div className="bg-sky-100/80 p-3 rounded-lg border border-sky-300 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-sky-900">Наименование (Ф.И.О.) собственника:</div>
                  <div className="font-bold text-stone-900 text-sm font-mono">{ownerName}</div>
                  <div className="text-[10px] text-stone-600">Адрес: Сектор 77</div>
                  <div className="text-[10px] text-stone-600 mt-1">Документ на право собственности: <span className="font-semibold text-stone-900">Договор купли-продажи от {purchaseDate}</span></div>
                </div>
              </div>

              {/* Seal */}
              <div className="flex justify-between items-center pt-2 border-t border-sky-300 font-sans">
                <div className="text-[10px] text-stone-600">
                  Орган, выдавший ПТС: <br/>
                  <span className="font-semibold text-stone-900">{issuingAuthority}</span>
                </div>
                <div className="border-2 border-blue-800 rounded-full p-2 w-20 h-20 flex flex-col items-center justify-center text-center text-blue-800 transform rotate-6 shadow-sm bg-blue-50/40">
                  <ShieldCheck className="w-5 h-5 text-blue-800" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">АВТОИНСПЕКЦИЯ</span>
                  <span className="text-[6px] font-mono">ПЕЧАТЬ</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. ДОГОВОР КУПЛИ-ПРОДАЖИ АВТО (ДКП) ==================== */}
          {isCarDkp && (
            <div className="bg-white text-stone-900 border border-stone-300 rounded-xl p-4 sm:p-6 shadow-md relative font-serif space-y-4">
              <div className="text-center border-b border-stone-300 pb-3 font-sans">
                <h2 className="text-base sm:text-lg font-bold uppercase text-stone-900">
                  Договор купли-продажи транспортного средства
                </h2>
                <div className="text-xs font-mono text-stone-600 mt-1">
                  № {documentSeries} от {purchaseDate}
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-stone-800 font-sans">
                <p>
                  <span className="font-bold">Продавец:</span> {sellerName}<br />
                  <span className="font-bold">Покупатель:</span> {ownerName}
                </p>

                <p className="indent-4">
                  1. Продавец обязуется передать в собственность Покупателю, а Покупатель обязуется принять и оплатить следующее транспортное средство:
                </p>

                <div className="bg-stone-100 p-3 rounded border border-stone-300 space-y-1 font-mono text-[11px]">
                  <div>Марка, модель: <span className="font-bold">{vehicleName}</span></div>
                  <div>Идентификационный номер (VIN): <span className="font-bold">{vehicleVin}</span></div>
                  <div>Год выпуска: <span>{vehicleYear} г.</span></div>
                  <div>Цвет кузова: <span>{vehicleColor}</span></div>
                  <div>Гос. регистрационный знак: <span className="font-bold">{licensePlate}</span></div>
                </div>

                <p className="indent-4">
                  2. Указанное транспортное средство продается за <span className="font-bold text-emerald-900">{priceRub.toLocaleString('ru-RU')} рублей</span>. Расчеты произведены полностью наличными денежными средствами в момент подписания настоящего договора.
                </p>

                {/* Signatures */}
                <div className="pt-4 grid grid-cols-2 gap-4 border-t border-stone-300 mt-4 text-[11px]">
                  <div>
                    <div className="font-bold text-stone-700">ПОДПИСЬ ПРОДАВЦА:</div>
                    <div className="font-serif italic font-bold text-blue-900 mt-2 text-sm">ООО «Премиум Моторс» / М.П.</div>
                  </div>
                  <div>
                    <div className="font-bold text-stone-700">ПОДПИСЬ ПОКУПАТЕЛЯ:</div>
                    <div className="font-serif italic font-bold text-stone-900 mt-2 text-sm">{ownerName}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 4. ВЫПИСКА ЕГРН (НЕДВИЖИМОСТЬ) ==================== */}
          {isEgrn && (
            <div className="bg-stone-50 text-stone-900 border border-stone-300 rounded-xl p-4 sm:p-6 shadow-md relative font-serif space-y-4">
              {/* Header */}
              <div className="text-center border-b border-stone-300 pb-3 font-sans">
                <div className="text-[10px] uppercase font-bold text-stone-600 tracking-wider">
                  Служба государственной регистрации недвижимости и кадастра
                </div>
                <h2 className="text-base sm:text-lg font-bold uppercase text-stone-900 mt-1">
                  Выписка из Единого Реестра Недвижимости
                </h2>
                <div className="text-xs font-mono text-stone-600 mt-1">
                  Кадастровый номер: <span className="font-bold text-stone-900">{cadastralNumber}</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-3 text-xs font-sans">
                <table className="w-full text-left border-collapse border border-stone-300">
                  <tbody>
                    <tr className="border-b border-stone-300 bg-stone-100">
                      <td className="p-2 font-semibold text-stone-700 w-1/3">Адрес (местоположение):</td>
                      <td className="p-2 font-bold text-stone-900">{address}</td>
                    </tr>
                    <tr className="border-b border-stone-300">
                      <td className="p-2 font-semibold text-stone-700">Назначение объекта:</td>
                      <td className="p-2 text-stone-900">Жилое помещение (Квартира)</td>
                    </tr>
                    <tr className="border-b border-stone-300 bg-stone-100">
                      <td className="p-2 font-semibold text-stone-700">Общая площадь:</td>
                      <td className="p-2 font-mono font-bold text-stone-900">{areaSqM} м² ({roomsCount}-комнатная)</td>
                    </tr>
                    <tr className="border-b border-stone-300">
                      <td className="p-2 font-semibold text-stone-700">Этаж:</td>
                      <td className="p-2 font-mono text-stone-900">{floor}</td>
                    </tr>
                    <tr className="border-b border-stone-300 bg-stone-100">
                      <td className="p-2 font-semibold text-stone-700">Кадастровая стоимость:</td>
                      <td className="p-2 font-mono font-bold text-stone-900">{cadastralValueRub.toLocaleString('ru-RU')} ₽</td>
                    </tr>
                    <tr className="border-b border-stone-300">
                      <td className="p-2 font-semibold text-stone-700">Правообладатель:</td>
                      <td className="p-2 font-mono font-bold text-emerald-900">{ownerName}</td>
                    </tr>
                    <tr className="border-b border-stone-300 bg-stone-100">
                      <td className="p-2 font-semibold text-stone-700">Вид права / Доля:</td>
                      <td className="p-2 font-semibold text-stone-900">Собственность (1/1)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-stone-700">Запись регистрации:</td>
                      <td className="p-2 font-mono text-stone-900">№ {registrationRecord} от {purchaseDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Digital Stamp Seal */}
              <div className="pt-3 border-t border-stone-300 flex items-center justify-between font-sans">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 p-2 rounded-lg text-[10px] text-blue-900">
                  <FileCheck className="w-5 h-5 text-blue-700 shrink-0" />
                  <div>
                    <div className="font-bold">ЭЛЕКТРОННАЯ ЦИФРОВАЯ ПОДПИСЬ РЕЕСТРА</div>
                    <div className="font-mono text-[9px] text-blue-700">Сертификат № 00E1036E102948192014</div>
                  </div>
                </div>

                <div className="border-2 border-blue-800 rounded-full p-2 w-20 h-20 flex flex-col items-center justify-center text-center text-blue-800 transform -rotate-6 shadow-sm bg-blue-50/20">
                  <ShieldCheck className="w-5 h-5 text-blue-800" />
                  <span className="text-[8px] font-bold uppercase mt-0.5">РЕЕСТР</span>
                  <span className="text-[6px] font-mono">СЕКТОР 77</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 5. ДКП НЕ ДВИЖИМОСТИ ==================== */}
          {isPropertyDkp && (
            <div className="bg-white text-stone-900 border border-stone-300 rounded-xl p-4 sm:p-6 shadow-md relative font-serif space-y-4">
              <div className="text-center border-b border-stone-300 pb-3 font-sans">
                <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  Нотариальная Палата Сектора 77
                </div>
                <h2 className="text-base sm:text-lg font-bold uppercase text-stone-900 mt-1">
                  Договор купли-продажи квартиры
                </h2>
                <div className="text-xs font-mono text-stone-600 mt-1">
                  Реестровый № {registrationRecord} от {purchaseDate}
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-stone-800 font-sans">
                <p>
                  <span className="font-bold">Продавец:</span> {sellerName}<br />
                  <span className="font-bold">Покупатель:</span> {ownerName}
                </p>

                <p className="indent-4">
                  1. Продавец продает, а Покупатель покупает в собственность жилое помещение (квартиру), расположенное по адресу: <span className="font-bold text-stone-900">{address}</span>, кадастровый номер: <span className="font-mono font-bold">{cadastralNumber}</span>, общей площадью <span className="font-bold">{areaSqM} м²</span>.
                </p>

                <p className="indent-4">
                  2. Стоимость квартиры по соглашению сторон составляет <span className="font-bold text-emerald-900">{priceRub.toLocaleString('ru-RU')} рублей</span>. Расчет произведен полностью до подписания настоящего договора.
                </p>

                <div className="pt-4 grid grid-cols-2 gap-4 border-t border-stone-300 mt-4 text-[11px]">
                  <div>
                    <div className="font-bold text-stone-700">ПРОДАВЕЦ:</div>
                    <div className="font-serif italic font-bold text-amber-900 mt-2 text-sm">{sellerName}</div>
                  </div>
                  <div>
                    <div className="font-bold text-stone-700">ПОКУПАТЕЛЬ:</div>
                    <div className="font-serif italic font-bold text-stone-900 mt-2 text-sm">{ownerName}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 6. ТЕХПАСПОРТ БТИ ==================== */}
          {isTechPass && (
            <div className="bg-stone-50 text-stone-900 border border-stone-300 rounded-xl p-4 sm:p-6 shadow-md relative font-serif space-y-4">
              <div className="text-center border-b border-stone-300 pb-3 font-sans">
                <div className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">
                  Бюро Технической Инвентаризации (БТИ) Сектора 77
                </div>
                <h2 className="text-base sm:text-lg font-bold uppercase text-stone-900 mt-1">
                  Технический паспорт жилого помещения
                </h2>
                <div className="text-xs font-mono text-stone-600 mt-1">
                  Инвентарный номер: {cadastralNumber}
                </div>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="bg-white p-3 rounded border border-stone-300 space-y-1">
                  <div>Адрес объекта: <span className="font-bold">{address}</span></div>
                  <div>Общая площадь: <span className="font-bold font-mono">{areaSqM} м²</span></div>
                  <div>Число жилых комнат: <span className="font-bold">{roomsCount}</span></div>
                  <div>Этаж: <span className="font-bold font-mono">{floor}</span></div>
                </div>

                {/* Architectural schematic box */}
                <div className="bg-sky-50 border-2 border-dashed border-sky-300 rounded-lg p-4 text-center space-y-2">
                  <div className="text-[11px] font-bold text-sky-900 uppercase">Поэтажный экспликационный план (БТИ)</div>
                  <div className="bg-white border border-sky-200 h-28 rounded flex items-center justify-center font-mono text-xs text-sky-800 font-bold">
                    [ ПОЭТАЖНЫЙ ПЛАН И СХЕМА КВАРТИРЫ № {address.match(/кв\.\s*(\d+)/)?.[1] || '45'} ]
                  </div>
                  <div className="text-[10px] text-stone-500">Масштаб 1:100. Инженерные коммуникации: Центральное отопление, ХВС/ГВС, Электроснабжение.</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl transition-colors shadow-md"
          >
            Закрыть документ
          </button>
        </div>
      </div>
    </div>
  );
};
