import assortment from './assortment.json';

export type Family = 'pp' | 'pgs' | 'pz' | 'sigma';
export type RangeRow = { H: number[]; B1: number[]; B2: number[]; C?: number[]; t: number[]; tList?: number[] };
export const ranges = assortment as Record<Family, RangeRow[]>;
export const profiles: Record<Family, { name: string; short: string; subtitle: string; description: string; use: string; height: string; thickness: string; flange: string; defaults: { H: string; B1: string; B2: string; C1: string; C2: string; t: string } }> = {
  pp: { name:'ПП', short:'П-образный', subtitle:'Швеллерный профиль', description:'Открытое П-образное сечение без отгибок. Для направляющих и элементов каркаса по проекту.', use:'Направляющие · обрамления · элементы каркаса', height:'100–350', thickness:'1,0–3,0', flange:'40–100', defaults:{H:'200', B1:'65', B2:'65', C1:'', C2:'', t:'2'} },
  pgs: { name:'ПГС', short:'С-образный', subtitle:'Профиль с отгибками', description:'Две полки с продольными отгибками направлены в одну сторону. Для стоек, балок и прогонов по расчёту.', use:'Стойки · балки · прогоны', height:'100–350', thickness:'1,0–3,0', flange:'40–100', defaults:{H:'200', B1:'70', B2:'70', C1:'18', C2:'18', t:'2'} },
  pz: { name:'ПZ', short:'Z-образный', subtitle:'Z-образный профиль', description:'Встречные полки разной ширины позволяют организовать соединение прогонов внахлёст. Размеры узла и отверстия задаются проектом.', use:'Кровельные прогоны · стеновые ригели', height:'100–350', thickness:'1,0–3,0', flange:'40–100', defaults:{H:'200', B1:'70', B2:'67', C1:'18', C2:'18', t:'2'} },
  sigma: { name:'ПГС-сигма', short:'Σ-образный', subtitle:'Профиль с рифом стенки', description:'Сечение с дополнительными продольными гибами стенки. Геометрия рифа согласовывается по чертежу.', use:'Балки · прогоны · элементы каркаса', height:'200', thickness:'1,2–3,0', flange:'65', defaults:{H:'200', B1:'65', B2:'65', C1:'20', C2:'20', t:'2'} },
};
export const families = Object.keys(profiles) as Family[];
export const rangeText = (values: number[]) => values.map(v=>String(v).replace('.',',')).filter((v,i,a)=>i===0||v!==a[0]).join('–');
export type QuoteItem = { id: string; family: Family; H: string; B1: string; B2: string; C1: string; C2: string; t: string; length: string; quantity: string; thermal: boolean; holes: string };
export function itemLabel(item: QuoteItem) {
  return `${item.thermal ? 'Т' : ''}${profiles[item.family].name} · H ${item.H} · B₁ ${item.B1} / B₂ ${item.B2}${item.family==='pp'?'':` · C₁ ${item.C1} / C₂ ${item.C2}`} · t ${item.t} мм`;
}
