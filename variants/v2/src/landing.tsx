'use client';

import { useRef, useState, useEffect, type FormEvent } from 'react';
import { ArrowRight, ArrowDown, ArrowUpRight, Download, Menu, Phone, Plus, X, Paperclip, FileText, CheckCircle2, LoaderCircle, ScanLine, CircleDot, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { profiles, families, ranges, rangeText, itemLabel, type Family, type QuoteItem, type RangeRow } from '@/lib/profiles';
import { createEmailDraft } from '@/lib/email-draft';
import { leadSchema, allowedExtensions, maxUploadBytes } from '@/lib/lead-validation';

const nav = [['#profiles','Профили'],['#capabilities','Производство'],['#documents','Документы']];
const faqs = [
  ['От чего зависит цена профиля?','От сечения, толщины и марки стали, покрытия, длины, объёма заказа и пробивки. Пришлите спецификацию — в коммерческом предложении будут зафиксированы состав поставки, стоимость и условия.'],
  ['Можно обратиться без готового КМД?','Да. Опишите, какие профили нужны и для какого объекта. Если размеры пока неизвестны, приложите имеющиеся чертежи или перечислите исходные данные в свободной форме.'],
  ['Можно ли заказать свою геометрию?','Да, можно направить чертёж нестандартного сечения. Перед заказом согласовываются размеры, радиусы, металл и возможность изготовления на оборудовании.'],
  ['Как заказать отверстия для соединения внахлёст?','Приложите схему соединения с диаметрами и координатами отверстий. Длину нахлёста, количество крепежа и расстояния до кромок определяет проектировщик по расчёту узла.'],
  ['Термопросечка и монтажные отверстия — одно и то же?','Нет. Термопросечка — система узких прорезей в стенке термопрофиля. Круглые монтажные отверстия предназначены для крепежа и задаются отдельно.'],
  ['Как согласовать срок и доставку?','Укажите город, объём и желаемую дату поставки. Срок изготовления и условия доставки подтверждаются при согласовании заказа.']
];

export default function Landing() {
  const [family,setFamily]=useState<Family>('pz');
  const [mode,setMode]=useState<'image'|'drawing'>('image');
  const [search,setSearch]=useState('');
  const [menu,setMenu]=useState(false);
  const [privacy,setPrivacy]=useState(false);
  const [config,setConfig]=useState<QuoteItem|null>(null);
  const [items,setItems]=useState<QuoteItem[]>([]);
  const [files,setFiles]=useState<File[]>([]);
  const [consent,setConsent]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState<{reference:string;receipt:string;draft?:boolean;eml?:string}|null>(null);
  const [endpoint,setEndpoint]=useState('');
  const [copyStatus,setCopyStatus]=useState('');
  useEffect(()=>{const url=window.INSI_CONFIG?.quoteEndpoint||'';if(url.startsWith('https://'))setEndpoint(url);},[]);
  const submissionId=useRef('');
  const formRef=useRef<HTMLFormElement>(null);

  function openConfig(key=family,row?:RangeRow,thermal=false) {
    const d={...profiles[key].defaults};
    if(row){d.H=String(row.H[0]);d.B1=String(row.B1[0]);d.B2=String(row.B2[0]);d.t=String(row.tList?.includes(2)?2:row.t[0]);if(row.C)d.C1=d.C2=String(row.C[0]);}
    setConfig({id:crypto.randomUUID(),family:key,...d,length:'',quantity:'',thermal:key!=='sigma'&&thermal,holes:'По чертежу'});
  }
  function scrollToOrder(message?:string) {
    setSuccess(null);
    if(message&&formRef.current){const el=formRef.current.elements.namedItem('message') as HTMLTextAreaElement;if(el)el.value=message;}
    document.getElementById('order')?.scrollIntoView({behavior:'smooth'});
  }
  function addFiles(next: FileList|null) {
    if(!next)return;
    const merged=[...files,...Array.from(next)];
    if(merged.length>5){setError('Можно прикрепить до 5 файлов.');return;}
    if(merged.some(f=>!allowedExtensions.includes(f.name.split('.').pop()?.toLowerCase()||''))){setError('Этот формат не поддерживается. Прикрепите PDF, таблицу, чертёж DWG/DXF, документ или изображение.');return;}
    if(merged.some(f=>f.size>5*1024*1024)||merged.reduce((s,f)=>s+f.size,0)>maxUploadBytes){setError('Один файл — до 5 МБ, все вложения — до 12 МБ.');return;}
    setFiles(merged);setError('');
  }
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(busy)return;setError('');
    const fields=new FormData(e.currentTarget);
    submissionId.current ||= crypto.randomUUID();
    const parsed=leadSchema.safeParse({id:submissionId.current,name:fields.get('name'),contact:fields.get('contact'),company:fields.get('company'),city:fields.get('city'),message:fields.get('message'),consent,items});
    if(!parsed.success){setError(parsed.error.issues[0]?.message==='Invalid literal value, expected true'?'Подтвердите согласие на обработку данных.':parsed.error.issues[0]?.message||'Проверьте поля заявки.');return;}
    setBusy(true);
    try {
      const reference=`ИН-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${parsed.data.id.slice(0,8).toUpperCase()}`;
      const receipt=`ИНСИ · Запрос ${reference}\n${new Date().toLocaleString('ru-RU')}\n\n${parsed.data.name}\n${parsed.data.contact}\n${parsed.data.company}\n${parsed.data.city}\n\n${items.map(i=>`${itemLabel(i)}; длина ${i.length||'уточнить'} мм; ${i.quantity||'уточнить'} шт.; отверстия: ${i.holes}`).join('\n')}\n\n${parsed.data.message}\n\nВложения: ${files.map(f=>f.name).join(', ')||'нет'}`;
      if(endpoint){
        const data=new FormData();data.append('payload',JSON.stringify(parsed.data));files.forEach(f=>data.append('files',f));
        const response=await fetch(endpoint,{method:'POST',body:data});const result=await response.json() as {error?:string;reference?:string};
        if(!response.ok||!result.reference)throw new Error(result.error||'Не удалось отправить заявку. Повторите попытку.');
        setSuccess({reference:result.reference,receipt:receipt.replace(reference,result.reference)});
      }else{
        const eml=await createEmailDraft(`Запрос стоимости профилей ${reference}`,receipt,files);
        setSuccess({reference,receipt,draft:true,eml});
      }
      setItems([]);setFiles([]);setConsent(false);submissionId.current='';formRef.current?.reset();

    } catch(err){setError(err instanceof Error?err.message:'Соединение прервалось. Данные формы сохранены — попробуйте ещё раз.');}
    finally{setBusy(false);}
  }
  function downloadEmail(){if(!success?.eml)return;const url=URL.createObjectURL(new Blob([success.eml],{type:'message/rfc822'}));const a=document.createElement('a');a.href=url;a.download=`${success.reference}.eml`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function copyReceipt(){if(!success)return;try{await navigator.clipboard.writeText(success.receipt);setCopyStatus('Текст скопирован');}catch{setCopyStatus('Не удалось скопировать. Используйте кнопку «Сохранить текст».');}}
  function downloadReceipt(){if(!success)return;const url=URL.createObjectURL(new Blob([success.receipt],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`INSI-${success.reference}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  return <>
    <a className="skip" href="#main">Перейти к содержанию</a>
    <header className="site-header"><div className="shell header-inner">
      <a className="brand" href="#main" aria-label="ИНСИ — на главную"><img src="./media/logo.png" alt="ИНСИ" width="124" height="45"/><span>Стальные конструкции и профили</span></a>
      <nav className="desktop-nav" aria-label="Основная навигация">{nav.map(([href,label])=><a key={href} href={href}>{label}</a>)}</nav>
      <div className="header-contact"><a className="phone" href="tel:88001002011">8 800 100 20 11</a><a className="btn btn-dark" href="#order">Запросить КП <ArrowUpRight/></a>
      <Sheet open={menu} onOpenChange={setMenu}><SheetTrigger asChild><button className="menu-btn" aria-label="Открыть меню"><Menu/></button></SheetTrigger><SheetContent><SheetTitle className="px-6 pt-6 text-2xl">ИНСИ</SheetTitle><SheetDescription className="px-6">Профили ЛСТК от производителя</SheetDescription><nav className="menu-links">{[...nav,['#order','Запросить стоимость']].map(([href,label])=><a key={href} href={href} onClick={()=>setMenu(false)}>{label}</a>)}<a href="tel:88001002011">8 800 100 20 11</a></nav></SheetContent></Sheet>
      </div>
    </div></header>
    <main id="main">
      <section className="hero"><div className="shell">
        <div className="hero-top"><div className="hero-copy"><div className="kicker">ИНСИ · Производство в Челябинске</div><h1>Профили ЛСТК<br/>от <span>производителя.</span></h1><p>Стандартные сечения и изготовление по вашим чертежам. Профиль, длина и отверстия — под задачу вашего проекта.</p><div className="hero-actions"><a className="btn btn-primary" href="#order">Получить стоимость <ArrowRight/></a><a className="text-link" href="#profiles">Выбрать профиль <ArrowDown size={16}/></a></div></div>
        <div className="hero-visual"><div className="visual-tag">СТАЛЬ / ГЕОМЕТРИЯ / ТОЧНОСТЬ</div><img src="./media/pz.webp" alt="Визуализация оцинкованного Z-профиля с продольными отгибками и отверстиями в стенке" width="1440" height="960" fetchPriority="high"/><div className="hero-caption"><strong>ПZ · Z-образное сечение</strong><span>Отверстия по чертежу заказа</span></div></div></div>
        <div className="facts"><div className="fact"><b>100–350 <small>мм</small></b><span>высота в сортаменте</span></div><div className="fact"><b>1,0–3,0 <small>мм</small></b><span>толщина по типоразмеру</span></div><div className="fact"><b>4 <small>формы</small></b><span>ПП · ПГС · ПZ · Сигма</span></div><div className="fact"><b>По проекту</b><span>термопросечка и пробивка</span></div></div>
      </div></section>

      <section id="profiles" className="section profiles-section"><div className="shell"><div className="section-head"><div><div className="kicker">Сортамент</div><h2>Выберите сечение.<br/>Задайте параметры.</h2></div><p>Сравните форму и назначение. Добавьте нужные позиции в одну заявку или сразу приложите спецификацию.</p></div>
        <Tabs value={family} onValueChange={v=>{setFamily(v as Family);setSearch('');}}>
          <TabsList className="profile-selector" aria-label="Форма профиля">{families.map(key=><TabsTrigger className="profile-trigger" key={key} value={key}><img src={`./media/${key}.webp`} alt="" loading="lazy" width="220" height="73"/><div><strong>{profiles[key].name}</strong><small>{profiles[key].short}</small></div></TabsTrigger>)}</TabsList>
          {families.map(key=>{const p=profiles[key];const rows=ranges[key].filter(r=>!search||[...r.H,...r.B1,...r.B2,...r.t].some(v=>String(v).includes(search.replace(',','.'))));return <TabsContent key={key} value={key}>
            <div className="product-detail"><div className="product-view"><div className="view-modes" role="group" aria-label="Вид профиля"><button aria-pressed={mode==='image'} onClick={()=>setMode('image')}>Объёмный вид</button><button aria-pressed={mode==='drawing'} onClick={()=>setMode('drawing')}>Чертёж сечения</button></div><img className={`product-image ${mode==='drawing'?'drawing':''}`} src={`./media/${key}${mode==='drawing'?'-drawing.svg':'.webp'}`} alt={mode==='drawing'?`Сечение ${p.name} с обозначениями H, B, ${key!=='pp'?'C, ':''}t и R`:`Визуализация профиля ${p.name}`} width="900" height="600" loading="lazy"/>{mode==='drawing'&&<a className="drawing-open" href={`./media/${key}-drawing.svg`} target="_blank" rel="noopener noreferrer">Открыть крупнее ↗</a>}<p className="view-caption">{mode==='drawing'?`H — высота · B — полки · ${key==='pp'?'':'C — отгибки · '}t — толщина · R — радиус`:'Визуализация. Размеры и расположение отверстий — по заказу.'}</p></div>
            <div className="product-info"><div className="product-title"><h3>{p.name}</h3><span className="tag">{p.short}</span></div><p>{p.description}</p><div className="dimension-summary"><div><b>{p.height}</b><span><span className="symbol">H</span>высота, мм</span></div><div><b>{p.flange}</b><span><span className="symbol">B</span>полка, мм</span></div><div><b>{p.thickness}</b><span><span className="symbol">t</span>толщина, мм</span></div></div><div className="application">{p.use}</div><button className="btn btn-dark" onClick={()=>openConfig(key)}>Задать параметры <Plus/></button><p className="product-note">{key==='sigma'?'Показан вариант 200 × 65 × 20. Геометрия рифа — по согласованному чертежу.':'Диапазоны относятся к сортаменту. Совместимость размеров уточняется при подборе.'}</p></div></div>
            <details className="assortment-disclosure"><summary>Смотреть сортамент {p.name} <SlidersHorizontal/></summary><label className="sr-only" htmlFor={`search-${key}`}>Поиск по размеру</label><input id={`search-${key}`} className="input search" placeholder="Поиск по высоте или размеру" value={search} onChange={e=>setSearch(e.target.value)}/><div className="data-table"><table><thead><tr><th>H, мм</th><th>B₁, мм</th><th>B₂, мм</th>{key!=='pp'&&<th>C₁ = C₂, мм</th>}<th>t, мм</th><th><span className="sr-only">Выбор</span></th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{rangeText(r.H)}</td><td>{rangeText(r.B1)}</td><td>{rangeText(r.B2)}</td>{key!=='pp'&&<td>{r.C?rangeText(r.C):'—'}</td>}<td>{r.tList?r.tList.map(v=>String(v).replace('.',',')).join('; '):rangeText(r.t)}</td><td><button onClick={()=>openConfig(key,r)}>В заявку →</button></td></tr>)}{!rows.length&&<tr><td colSpan={6}>По этому размеру нет строк. Измените поиск или отправьте свой чертёж.</td></tr>}</tbody></table></div><p className="table-note">{key==='sigma'?'Основные размеры варианта ИНСИ из каталога.':'Диапазоны из таблиц приложения А ГОСТ Р 58384–2019, отобранные в каталоге ИНСИ.'} Наличие строки не означает наличие на складе. Окончательное сечение согласовывается в заказе.</p></details>
          </TabsContent>})}
        </Tabs>
      </div></section>

      <section id="capabilities" className="section capabilities"><div className="shell"><div className="section-head"><div><div className="kicker">Возможности производства</div><h2>Подготовлен<br/>к вашему проекту.</h2></div><p>Геометрия, обработка и комплектность согласуются вместе — ещё до выпуска профиля.</p></div><div className="cap-grid">
        <article className="cap-card"><div className="cap-card-head"><ScanLine className="cap-icon"/><h3>Термопросечка</h3><p>Система продольных прорезей в стенке термопрофиля для увеличения пути теплового потока.</p></div><img className="thermal-image" src="./media/thermal.svg" alt="Размерная схема термопросечки ТПП: прорезь 75 на 3 мм, продольная перемычка 25 мм, смещение соседних рядов 50 мм" loading="lazy" width="650" height="240"/><div className="cap-bottom"><div><b>ТПП · ТПГС · ТПZ</b><span>На схеме — фрагмент стенки ТПП по ТУ</span></div><button onClick={()=>openConfig(family==='sigma'?'pgs':family,undefined,true)}>Выбрать термопрофиль ↗</button></div></article>
        <article className="cap-card"><div className="cap-card-head"><CircleDot className="cap-icon"/><h3>Отверстия по КМД</h3><p>Пробивка под крепёж по согласованной схеме. Для монтажных узлов и соединений профилей.</p></div><img className="punch-image" src="./media/pz.webp" alt="Пример круглых отверстий в стенке Z-профиля" loading="lazy" width="650" height="240"/><div className="cap-bottom"><div><b>Ø 12 · 13 · 14 · 18 · 22</b><span>Диаметры инструмента LGS-2, мм</span></div><button onClick={()=>scrollToOrder('Нужна пробивка отверстий по КМД. ')}>Приложить схему ↗</button></div></article>
      </div><div className="custom-band"><div><h3>Нужна другая геометрия?</h3><p>Пришлите чертёж. Проверим возможность изготовления и уточним параметры заказа.</p></div><button className="btn" onClick={()=>scrollToOrder('Нужен нестандартный профиль по чертежу. ')}>Отправить чертёж <ArrowUpRight/></button></div></div></section>

      <section id="documents" className="section documents"><div className="shell doc-layout"><div className="doc-intro"><div className="kicker">Техническая основа</div><h2>Документы<br/>под рукой.</h2><p>Размеры сечений, обозначения и документы на продукцию — для подбора и согласования.</p><div className="standards">ГОСТ Р 58384–2019<br/>ТУ 25.11.23-002-00206227-2020 — термопрофили</div></div><div className="doc-list">
        <a className="doc-row" href="./documents/catalogue.pdf" target="_blank" rel="noopener noreferrer"><span className="doc-icon"><FileText size={21}/></span><div><strong>Технический каталог ИНСИ</strong><small>PDF · 7 страниц · актуальный сортамент</small></div><ArrowUpRight/></a>
        <a className="doc-row" href="./documents/certificate.pdf" target="_blank" rel="noopener noreferrer"><span className="doc-icon"><FileText size={21}/></span><div><strong>Сертификат соответствия</strong><small>PDF · добровольная сертификация · до 30.08.2029</small></div><ArrowUpRight/></a>
        <a className="doc-row" href="./documents/insi-profile-drawings.zip" download><span className="doc-icon"><Download size={21}/></span><div><strong>Чертежи четырёх сечений</strong><small>ZIP · 4 SVG · ПП, ПГС, ПZ и ПГС-сигма</small></div><Download/></a>
        <a className="doc-row" href="./media/thermal.svg" download><span className="doc-icon"><Download size={21}/></span><div><strong>Схема термопросечки ТПП</strong><small>SVG · размерный фрагмент стенки</small></div><Download/></a>
      </div></div></section>

      <section className="section"><div className="shell"><div className="section-head"><div><div className="kicker">От запроса к поставке</div><h2>Понятный порядок работы.</h2></div></div><div className="process"><article className="step"><span className="number">01 / ЗАДАЧА</span><h3>Вы присылаете данные</h3><p>Выбранные профили, спецификацию или описание задачи. На старте достаточно того, что уже известно.</p></article><article className="step"><span className="number">02 / СОГЛАСОВАНИЕ</span><h3>Уточняем состав и цену</h3><p>Сечение, металл, длину и пробивку. Фиксируем стоимость, срок производства и условия поставки.</p></article><article className="step"><span className="number">03 / ПРОИЗВОДСТВО</span><h3>Изготавливаем по заказу</h3><p>Выпускаем согласованные профили и комплектуем поставку с документами на продукцию.</p></article></div></div></section>

      <section id="order" className="order-section"><div className="shell order-layout"><div className="order-aside"><div className="kicker">Рассчитаем ваш заказ</div><h2>От профиля<br/>к конкретной цене.</h2><p>Расскажите, что нужно. Соберите запрос из выбранных позиций или приложите готовую спецификацию.</p><div className="contact-card"><small>Обсудить с отделом продаж</small><a href="tel:88001002011">8 800 100 20 11</a><a href="mailto:zakaz@insi.ru">zakaz@insi.ru</a><small>Челябинск · ИНСИ</small></div></div>
        <form ref={formRef} className="order-form" onSubmit={submit} aria-label="Заявка на профили">
          {success?<div className="success" role="status"><CheckCircle2/><h3>{success.draft?'Запрос готов к отправке':'Заявка зарегистрирована'}</h3><p>{success.draft?'Скачайте письмо с вложениями и отправьте его из своей почты на zakaz@insi.ru. Пока запрос не отправлен.':'Параметры и вложения сохранены. Номер вашего обращения:'}</p><div className="refno">{success.draft?'Черновик · ':''}{success.reference}</div>{success.draft&&<button className="btn btn-primary" type="button" onClick={downloadEmail}>Скачать письмо EML <Download/></button>}<button className="btn btn-outline" type="button" onClick={downloadReceipt}>Сохранить текст <Download/></button>{success.draft&&<><button className="text-link mt-4" type="button" onClick={copyReceipt}>Скопировать текст</button><p className="copy-status" role="status">{copyStatus}</p></>}<button className="text-link mt-5" type="button" onClick={()=>setSuccess(null)}>Создать ещё одну заявку</button></div>:<>
          {items.length>0&&<div className="quote-items"><h3>Ваша спецификация · {items.length}</h3>{items.map(i=><div className="quote-item" key={i.id}><div><strong>{itemLabel(i)}</strong><span>{i.length?`L ${i.length} мм`:'Длина — уточнить'} · {i.quantity?`${i.quantity} шт.`:'Объём — уточнить'}</span></div><button type="button" aria-label={`Удалить ${profiles[i.family].name}`} onClick={()=>setItems(v=>v.filter(x=>x.id!==i.id))}><X/></button></div>)}<button className="text-link mt-3" type="button" onClick={()=>openConfig()}>Добавить профиль <Plus size={15}/></button></div>}
          <div className="form-row" style={{marginTop:0}}><div className="field"><label htmlFor="name">Ваше имя *</label><input id="name" name="name" autoComplete="name" placeholder="Как к вам обращаться" required minLength={2} maxLength={100}/></div><div className="field"><label htmlFor="contact">Телефон или e-mail *</label><input id="contact" name="contact" autoComplete="email" placeholder="+7 или name@company.ru" required maxLength={160}/></div></div><div className="form-row"><div className="field"><label htmlFor="company">Компания</label><input id="company" name="company" autoComplete="organization" placeholder="Название организации" maxLength={150}/></div><div className="field"><label htmlFor="city">Город поставки</label><input id="city" name="city" autoComplete="address-level2" placeholder="Куда нужен профиль" maxLength={150}/></div></div><div className="field"><label htmlFor="message">Что нужно изготовить{!items.length?' *':''}</label><textarea id="message" name="message" placeholder="Профиль, толщина, длина и объём. Если точных размеров пока нет — опишите задачу." required={!items.length} minLength={items.length?0:5} maxLength={5000}/></div>
          <label className="upload" htmlFor="attachments"><Paperclip size={23}/><div><b>Прикрепить чертёж или спецификацию</b><span>PDF, XLSX, DWG/DXF, документы, изображения<br/>До 5 файлов · по 5 МБ · всего до 12 МБ</span></div><input id="attachments" type="file" multiple accept={allowedExtensions.map(v=>'.'+v).join(',')} onChange={e=>{addFiles(e.target.files);e.target.value='';}}/></label>
          {files.length>0&&<div className="files">{files.map((f,i)=><span className="file-chip" key={`${f.name}-${i}`}>{f.name}<button type="button" aria-label={`Убрать файл ${f.name}`} onClick={()=>setFiles(v=>v.filter((_,j)=>i!==j))}><X/></button></span>)}</div>}
          <div className="consent"><Checkbox id="consent" checked={consent} onCheckedChange={v=>setConsent(v===true)} aria-required="true"/><div><label htmlFor="consent">Согласен на обработку указанных данных для ответа на запрос.</label> <button type="button" onClick={()=>setPrivacy(true)}>Подробнее</button></div></div>
          {error&&<div className="error" role="alert">{error}</div>}<button className="btn btn-primary" type="submit" disabled={busy}>{busy?<>{endpoint?'Отправляем':'Готовим запрос'} <LoaderCircle className="animate-spin"/></>:<>{endpoint?'Запросить стоимость':'Подготовить запрос'} <ArrowRight/></>}</button><p className="privacy-note">{endpoint?'Стоимость и срок фиксируются в коммерческом предложении.':'Подготовим письмо с параметрами и файлами. Отправка — из вашей почты.'}</p>
          </>}
        </form>
      </div></section>

      <section className="faq"><div className="shell faq-layout"><h2>Перед заказом</h2><div>{faqs.map(([q,a])=><details className="faq-item" key={q}><summary>{q}<Plus/></summary><p>{a}</p></details>)}</div></div></section>
    </main>
    <footer><div className="shell"><div className="footer-top"><div><a className="footer-brand" href="#main">ИНСИ</a><p>Стальные профили. Точная основа вашего проекта.</p></div><div className="footer-links">{nav.map(([href,label])=><a href={href} key={href}>{label}</a>)}<a href="https://www.insi.ru/" target="_blank" rel="noopener noreferrer">Основной сайт ↗</a></div></div><div className="footer-bottom"><span>© 2026 ИНСИ · Стальные конструкции и профили</span><button onClick={()=>setPrivacy(true)}>Обработка данных</button></div></div></footer>
    <div className="mobile-cta"><a href="tel:88001002011"><Phone size={15} className="inline mr-2"/>Позвонить</a><a className="btn btn-primary" href="#order">Получить стоимость <ArrowRight/></a></div>

    <Dialog open={!!config} onOpenChange={open=>{if(!open)setConfig(null);}}><DialogContent className="config"><DialogTitle className="config-heading">{config?.thermal?'Термопрофиль':'Профиль'} {config?profiles[config.family].name:''}</DialogTitle><DialogDescription>Задайте известные размеры. Длину и количество можно уточнить позже.</DialogDescription>{config&&<form onSubmit={e=>{e.preventDefault();if(items.length>=30){setError('В одной заявке — до 30 позиций. Остальные приложите файлом.');setConfig(null);scrollToOrder();return;}setItems(v=>[...v,config]);setConfig(null);scrollToOrder();}}>
      <div className="config-grid">{[['H','Высота H'],['B1','Полка B₁'],['B2','Полка B₂'],...(config.family!=='pp'?[['C1','Отгибка C₁'],['C2','Отгибка C₂']]:[]),['t','Толщина t'],['length','Длина L'],['quantity','Количество']].map(([key,label])=><div className="field" key={key}><label htmlFor={`dim-${key}`}>{label}, {key==='quantity'?'шт.':'мм'}</label><input id={`dim-${key}`} type="number" inputMode="decimal" min={key==='t'?0.7:1} max={key==='quantity'?100000:key==='length'?20000:key==='t'?3:1000} step={key==='quantity'?1:'0.1'} required={!['length','quantity'].includes(key)} value={config[key as keyof QuoteItem] as string} onChange={e=>setConfig({...config,[key]:e.target.value})} placeholder="Уточнить"/></div>)}</div>
      {config.family!=='sigma'&&<div className="flex gap-3 items-center my-4"><Checkbox id="thermal" checked={config.thermal} onCheckedChange={v=>setConfig({...config,thermal:v===true})}/><label htmlFor="thermal">Нужна термопросечка</label></div>}
      <div className="field"><label htmlFor="holes">Монтажные отверстия</label><input id="holes" value={config.holes} onChange={e=>setConfig({...config,holes:e.target.value})} placeholder="Не нужны / по КМД / указать диаметр" maxLength={250}/></div><p className="config-note">{config.family==='sigma'?'Геометрию рифа приложите отдельным чертежом. ':''}Возможность изготовления выбранного сочетания размеров подтверждается при согласовании заказа.</p><button type="submit" className="btn btn-primary">Добавить в заявку <Plus/></button>
    </form>}</DialogContent></Dialog>
    <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent className="privacy"><DialogTitle className="text-2xl">Обработка данных заявки</DialogTitle><DialogDescription>Для подготовки ответа на ваш запрос.</DialogDescription><p>{endpoint?'В заявку включаются указанные вами имя, контакт, организация, город, описание заказа и вложения. Они передаются для обработки обращения.':'Форма собирает черновик письма на вашем устройстве. До отправки из вашей почты имя, контакт, параметры и вложения не передаются в отдел продаж.'}</p><p>Контактные данные предназначены для связи по вашему обращению. Не прикладывайте документы с лишними персональными данными. Согласие не распространяется на рекламные рассылки.</p><p>По вопросам обработки обращения и отзыва согласия напишите на <a className="underline" href="mailto:zakaz@insi.ru">zakaz@insi.ru</a>, указав тему письма.</p></DialogContent></Dialog>
  </>;
}
