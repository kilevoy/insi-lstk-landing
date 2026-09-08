from pathlib import Path
from io import BytesIO
import json,fitz,subprocess
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/documents/catalogue.pdf'
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
NAVY=colors.HexColor('#142b42'); ORANGE=colors.HexColor('#df530c');GRAY=colors.HexColor('#53677a');LINE=colors.HexColor('#d7e0e6');PAPER=colors.HexColor('#f3f6f8')
c=canvas.Canvas(str(OUT),pagesize=(595.28,841.89));c.setTitle('ИНСИ - Каталог профилей ЛСТК');c.setAuthor('ИНСИ')
styles={s:ParagraphStyle(s,fontName='DejaVu',fontSize=size,leading=size*1.5,textColor=GRAY) for s,size in [('body',11),('small',8.2)]}
def text(x,y,t,size=11,bold=False,color=NAVY):
 c.setFillColor(color);c.setFont('DejaVuBold' if bold else 'DejaVu',size);c.drawString(x,y,t)
def para(t,x,y,w=510,style='body'):
 p=Paragraph(t,styles[style]);_,h=p.wrap(w,800);p.drawOn(c,x,y-h);return y-h

def head(n,label):
 text(38,801,'ИНСИ',22,True);text(133,803,'СТАЛЬНЫЕ ПРОФИЛИ',8,False,GRAY)
 c.setStrokeColor(LINE);c.line(38,783,557,783)
 text(38,29,'insi.ru  /  8 800 100 20 11  /  zakaz@insi.ru',8,False,GRAY)
 text(492,29,f'{n:02d} / 07',8,False,GRAY)
 text(38,762,label.upper(),8,True,ORANGE)
def picture(name,x,y,w,h):
 im=Image.open(ROOT/'public/media'/f'{name}.webp').convert('RGB');buf=BytesIO();im.save(buf,format='JPEG',quality=88,optimize=True);buf.seek(0)
 c.drawImage(ImageReader(buf),x,y,width=w,height=h,preserveAspectRatio=True,anchor='c',mask='auto')
def svg(name,x,y,w,h):
 dest=Path('/tmp')/f'insi-{name}.png'
 subprocess.run(['inkscape',str(ROOT/'public/media'/name),'--export-type=png',f'--export-filename={dest}','--export-width=1800'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 c.drawImage(str(dest),x,y,width=w,height=h,preserveAspectRatio=True,anchor='c')

def fmt(r):return '-'.join(dict.fromkeys(str(v).replace('.',',') for v in r))
def table(rows,y,widths,fs=8.4,rh=15):
 t=Table(rows,colWidths=widths,rowHeights=[23]+[rh]*(len(rows)-1));t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'DejaVu'),('FONTNAME',(0,0),(-1,0),'DejaVuBold'),('FONTSIZE',(0,0),(-1,-1),fs),('BACKGROUND',(0,0),(-1,0),PAPER),('TEXTCOLOR',(0,0),(-1,-1),NAVY),('LINEBELOW',(0,0),(-1,-1),.35,LINE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),3)]));_,h=t.wrap(520,800);t.drawOn(c,38,y-h);return y-h

head(1,'Каталог / сентябрь 2026')
text(38,677,'Профили ЛСТК',43,True);text(38,621,'от производителя.',39,True,ORANGE)
para('Стандартные сечения и изготовление по чертежам.\nПП, ПГС, ПZ и ПГС-сигма.',38,583)
picture('pz',27,238,540,325)
for x,value,desc in [(38,'100-350 мм','высота в сортаменте'),(225,'1,0-3,0 мм','толщина по типоразмеру'),(415,'По проекту','обработка и длина')]:
 text(x,188,value,17,True);text(x,165,desc,8.5,False,GRAY)
para('Каталог помогает составить запрос. Совместимость размеров, металл, радиусы, отверстия и условия поставки согласовываются в заказе.',38,115,510)
c.showPage()
data=json.loads((ROOT/'lib/assortment.json').read_text())
info=[('pp','ПП','Швеллерный профиль без отгибок','Направляющие, обрамления и элементы каркаса по проекту.'),('pgs','ПГС','Профиль с продольными отгибками','Стойки, балки и прогоны по расчёту.'),('pz','ПZ','Z-образный профиль','Встречные полки. Узлы соединения внахлёст - по проекту.'),('sigma','ПГС-сигма','Профиль с рифом стенки','Дополнительные продольные гибы стенки. Геометрия - по чертежу.')]
for n,(key,name,subtitle,desc) in enumerate(info,2):
 head(n,'Сортамент');text(38,723,name,33,True);text(38,697,subtitle,13,False,GRAY);text(38,675,desc,9,False,GRAY)
 picture(key,35,495,330,170);svg(f'{key}-drawing.svg',385,486,168,196)
 text(38,488,'ОСНОВНЫЕ РАЗМЕРЫ, ММ',8,True,ORANGE)
 cols=['H','B₁','B₂']+(['C₁ = C₂'] if key!='pp' else [])+['t'];rows=[cols]
 for r in data[key]:rows.append([fmt(r['H']),fmt(r['B1']),fmt(r['B2'])]+([fmt(r['C'])] if key!='pp' else [])+['; '.join(str(v).replace('.',',') for v in r['tList']) if 'tList'in r else fmt(r['t'])])
 y=table(rows,473,[75,85,85,274] if key=='pp' else [70,75,75,90,209],8.2,10.5 if key=='pp' else 14.5)
 if key=='sigma':
  para('Показан вариант 200 × 65 × 20. В обозначении 20 мм - размер отгибки C. Глубина и высоты рифа здесь не нормируются: их задаёт согласованный чертёж сечения.',38,y-25)
  para('H - высота; B₁, B₂ - полки; C₁, C₂ - отгибки; t - толщина; R - внутренний радиус гиба.',38,y-108)
  para('Для заказа приложите сечение с числовыми размерами рифа, радиусами гибов и указанными размерными базами.',38,y-165)
 else:
  para('Диапазоны выбраны из таблиц приложения А ГОСТ Р 58384-2019 в исходном каталоге ИНСИ. Конкретное сочетание размеров и возможность изготовления подтверждаются при согласовании.',38,y-15,519,'small')
 para('Изображение показывает форму профиля. Монтажные отверстия на визуализациях приведены как пример; их количество и координаты задаются отдельно.',38,80,519,'small')
 c.showPage()
head(6,'Термопрофили');text(38,721,'Термопросечка',32,True)
para('ТПП, ТПГС и ТПZ. Система продольных прорезей в стенке профиля для увеличения пути теплового потока.',38,686)
svg('thermal.svg',30,296,535,325)
text(38,274,'Фрагмент стенки ТПП',16,True)
para('Длина прорези - 75 мм; ширина - 3 мм. Продольная перемычка - 25 мм, период - 100 мм. Смещение соседних рядов - 50 мм. Поперечная перемычка - 6,5 мм.',38,242)
para('Схема по рисунку А.3 ТУ 25.11.23-002-00206227-2020. Расположение групп прорезей и исполнение конкретного термопрофиля задаются документацией на заказ.',38,148)
c.showPage()
head(7,'Пробивка / заявка');text(38,721,'Профиль под ваш проект',29,True)
para('Монтажные отверстия по согласованной схеме. Для соединений прогонов, крепёжных узлов и сборки элементов каркаса.',38,686)
text(38,602,'Ø 12 / 13 / 14 / 18 / 22 мм',23,True,ORANGE)
para('Диаметры пробивного инструмента LGS-2. Координаты, количество отверстий и возможность пробивки подтверждаются по чертежу.',38,574)
text(38,491,'Для расчёта стоимости',18,True)
for y,txt in [(455,'01  Сечение: H, B₁, B₂, C₁, C₂ и толщина t.'),(424,'02  Марка стали, покрытие, длина и количество.'),(393,'03  Нужна ли термопросечка; схема монтажных отверстий.'),(362,'04  Город, желаемая дата поставки и ваш контакт.')]:text(38,y,txt,10.5)
para('Нет всех параметров? Пришлите спецификацию, чертёж или описание задачи. Неизвестные параметры можно уточнить при согласовании.',38,317)
c.setStrokeColor(LINE);c.line(38,235,557,235)
text(38,200,'8 800 100 20 11',25,True);text(38,160,'zakaz@insi.ru',20,True,ORANGE)
para('Стоимость, срок изготовления и условия поставки фиксируются в коммерческом предложении.',38,110)
c.showPage();c.save()
doc=fitz.open(OUT)
for i in range(len(doc)):
 page=doc[i];page.get_pixmap(matrix=fitz.Matrix(1),alpha=False).save(f'/tmp/insi-catalogue-page-{i+1}.png')
print(f'{len(doc)} pages, {OUT.stat().st_size} bytes')
