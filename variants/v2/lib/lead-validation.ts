import { z } from 'zod';
const dimension = z.string().regex(/^\d{1,4}([.,]\d{1,2})?$/,'Проверьте размеры профиля').refine(v=>Number(v.replace(',','.'))>0,'Размер должен быть больше нуля');
export const leadSchema = z.object({
  id: z.string().uuid(), name:z.string().trim().min(2,'Укажите имя').max(100),
  contact:z.string().trim().min(5).max(160).refine(v=>z.string().email().safeParse(v).success || (/^[+\d\s()\-]+$/.test(v)&&v.replace(/\D/g,'').length>=10), 'Укажите телефон или e-mail'),
  company:z.string().trim().max(150), city:z.string().trim().max(150), message:z.string().trim().max(5000),
  consent:z.literal(true,{errorMap:()=>({message:'Подтвердите согласие на обработку данных.'})}),
  items:z.array(z.object({id:z.string().uuid(),family:z.enum(['pp','pgs','pz','sigma']),H:dimension,B1:dimension,B2:dimension,C1:z.string().max(8),C2:z.string().max(8),t:dimension,length:z.string().max(12),quantity:z.string().max(12),thermal:z.boolean(),holes:z.string().max(250)})).max(30)
}).refine(d=>d.items.length>0||d.message.length>=5,{message:'Добавьте профиль или опишите задачу',path:['message']});
export const allowedExtensions = ['pdf','xlsx','xls','csv','dwg','dxf','doc','docx','png','jpg','jpeg'];
export const maxUploadBytes=12*1024*1024;
