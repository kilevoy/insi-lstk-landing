export async function createEmailDraft(subject:string,text:string,files:File[]):Promise<string>{
  const boundary='INSI_'+crypto.randomUUID().replaceAll('-','');
  const bytesToBase64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
  const encode=(s:string)=>bytesToBase64(new TextEncoder().encode(s));
  const fold=(s:string)=>(s.match(/.{1,76}/g)||[]).join('\r\n');
  const encodedHeader=(s:string)=>`=?UTF-8?B?${encode(s)}?=`;
  const parts=[
    'To: zakaz@insi.ru',
    `Subject: ${encodedHeader(subject)}`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    fold(encode(text)),
  ];
  for(const file of files){
    const name=file.name.replace(/[\r\n"\\]/g,'_');
    parts.push(`--${boundary}`,'Content-Type: application/octet-stream','Content-Transfer-Encoding: base64',`Content-Disposition: attachment; filename="${encodedHeader(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,'',fold(bytesToBase64(new Uint8Array(await file.arrayBuffer()))));
  }
  parts.push(`--${boundary}--`,'');
  return parts.join('\r\n');
}
