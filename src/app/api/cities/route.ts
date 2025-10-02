// src/app/api/cities/route.ts
import { NextResponse } from 'next/server';

// 81 il
const TR_CITIES = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın',
  'Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
  'Çanakkale','Çankırı','Çorum',
  'Denizli','Diyarbakır',
  'Edirne','Elazığ','Erzincan','Erzurum','Eskişehir',
  'Gaziantep','Giresun','Gümüşhane',
  'Hakkari','Hatay','Isparta','Mersin',
  'İstanbul','İzmir',
  'Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya',
  'Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş',
  'Nevşehir','Niğde','Ordu',
  'Rize',
  'Sakarya','Samsun','Siirt','Sinop','Sivas',
  'Tekirdağ','Tokat','Trabzon','Tunceli',
  'Şanlıurfa','Uşak','Van',
  'Yozgat','Zonguldak',
  'Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır',
  'Yalova','Karabük','Kilis','Osmaniye','Düzce',
];

// TR duyarlı basit normalize (büyük harfe çevir + aksanları sadeleştir)
function normTr(s: string) {
  return s
    .toLocaleUpperCase('tr')       // i/İ, ı/I gibi farkları doğru ele al
    .replaceAll('Ş', 'S')
    .replaceAll('Ç', 'C')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('İ', 'I')
    .trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const nq = normTr(q);
  const items = TR_CITIES
    .filter((name) => normTr(name).startsWith(nq))
    .slice(0, 10);

  return NextResponse.json({ items });
}
