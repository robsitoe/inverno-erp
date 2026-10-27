import json, urllib.request, sys
B='http://localhost:3055'; T=open('/tmp/tok').read().strip(); C='company-001'
def call(m,p,body=None):
    r=urllib.request.Request(B+p,method=m,data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization':'Bearer '+T,'x-company-id':C,'content-type':'application/json'})
    try:
        with urllib.request.urlopen(r) as x: t=x.read().decode(); return x.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e: return e.code, e.read().decode()[:400]
ok=True
def chk(name,cond,info=''):
    global ok; print(('PASS ' if cond else 'FAIL ')+name, '' if cond else info); ok&=bool(cond)
def D(n=0):
    import datetime; return (datetime.date(2026,10,10)+datetime.timedelta(days=n)).isoformat()
s,r=call('POST','/customers',{'companyId':C,'code':'C001','name':'Cliente Teste','nif':'111'}); print('cust',s, str(r)[:150]); cust=r
s,r=call('POST','/suppliers',{'companyId':C,'code':'F001','name':'Fornecedor Teste','nif':'222'}); print('supp',s,str(r)[:150]); sup=r
s,r=call('POST','/inventory/articles',{'companyId':C,'code':'A1','name':'Artigo 1','purchasePrice':50,'salePrice':100,'ivaRate':16,'unit':'UN','stockControl':True}); print('art',s,str(r)[:150]); art=r
def sale(typ,qty,price,status='APPROVED',num=1):
    tot=qty*price*1.16
    return call('POST','/sales/documents',{'companyId':C,'documentType':typ,'series':'2026','seriesNumber':num,'documentNumber':f'{typ} 2026/{num}','date':D(),'dueDate':D(30),
      'customerId':'C001','customerName':'Cliente Teste','subtotal':qty*price,'discounts':0,'totalIva':qty*price*0.16,'total':tot,'status':status,
      'lines':[{'articleId':art['id'],'articleCode':'A1','articleName':'Artigo 1','quantity':qty,'unitPrice':price,'ivaRate':16}]})
def purch(typ,qty,price,status='APPROVED',num=1):
    tot=qty*price*1.16
    return call('POST','/purchases/documents',{'companyId':C,'documentType':typ,'series':'2026','seriesNumber':num,'documentNumber':f'{typ} 2026/{num}','date':D(),'dueDate':D(30),
      'supplierId':'F001','supplierCode':'F001','supplierName':'Fornecedor Teste','subtotal':qty*price,'discounts':0,'totalIva':qty*price*0.16,'total':tot,'status':status,
      'lines':[{'articleId':art['id'],'articleCode':'A1','articleName':'Artigo 1','quantity':qty,'unitPrice':price,'ivaRate':16}]})
def stock():
    s,r=call('GET','/inventory/articles/'+art['id']); return float(r.get('currentStock') or 0), float(r.get('averageCost') or 0)
# --- Compras
s,fc=purch('FC',100,50); chk('FC criada',s==201,fc); fc['totalValue']=float(fc.get('totalValue') or 5800)
st,avg=stock(); chk('FC entra stock 100',st==100,st); chk('PMP 50',abs(avg-50)<0.01,avg)
s,fc2=purch('FC',100,70,num=2); st,avg=stock(); chk('2a FC: stock 200, PMP 60',st==200 and abs(avg-60)<0.01,(st,avg))
# --- Vendas
s,fa=sale('FA',30,100); chk('FA criada',s==201,fa); st,avg=stock(); chk('FA sai stock -> 170',st==170,st)
s,fa2=sale('FA',10,100,num=2); st,_=stock(); chk('FA2 -> 160',st==160,st)
# --- Anular compra (REJECTED) reverte stock
s,r=call('PATCH',f"/purchases/documents/{fc2['id']}",{'status':'REJECTED'}); chk('FC2 rejeitada',s==200,r); st,_=stock(); chk('anular FC2 reverte 100 -> 60',st==60,st)
s,r=call('PATCH',f"/purchases/documents/{fc2['id']}",{'status':'REJECTED'}); st,_=stock(); chk('anular 2x idempotente',st==60,st)
# --- Recibo FA
rec={'id':'REC1','number':'RE 2026/1','docType':'RE','series':'2026','seriesNumber':1,'date':D(1),'type':'RECEIPT','amount':1000,'customerCode':'C001','customerName':'Cliente Teste','paymentMethod':'NUM','companyId':C,
  'description':'Recebimento','relatedDocument':fa['documentNumber'],'lines':[{'docType':'FA','docNumber':fa['documentNumber'],'originalAmount':float(fa['total']),'amount':1000,'discount':0}]}
s,r=call('POST','/treasury/receipts',rec); print('receipt',s,str(r)[:200]); rec_id=r.get('id') if isinstance(r,dict) else None
s,r=call('GET',f'/treasury/statement?side=CUSTOMER&entity=C001&name=Cliente%20Teste&companyId={C}'); print('stmt',s); 
if isinstance(r,dict):
    print(json.dumps({k:v for k,v in r.items() if k!='movements'}), len(r['movements']))
    exp=float(fa['total'])+float(fa2['total'])-1000
    chk('extrato cliente saldo = FA+FA2-recibo',abs(r['finalBalance']-exp)<0.01,(r['finalBalance'],exp))
    chk('extrato inclui recibo',any('RE' in str(m.get('docNumber',m.get('document',''))) or 'Receb' in json.dumps(m) for m in r['movements']),r['movements'])
s,r=call('GET',f'/treasury/aging?side=CUSTOMER&companyId={C}'); print('aging',s,str(r)[:300])
s,r=call('GET',f'/treasury/open-items?side=CUSTOMER&entity=C001&companyId={C}'); print('open',s,str(r)[:400])
# --- Anular recibo
if rec_id:
    s,r=call('PATCH',f'/treasury/documents/{rec_id}/void',{'reason':'erro'}); chk('anular recibo',s==200,r)
    s,r=call('PATCH',f'/treasury/documents/{rec_id}/void',{'reason':'erro'}); chk('anular 2x recusado',s>=400,(s,r))
    s,r=call('GET',f'/treasury/statement?side=CUSTOMER&entity=C001&name=Cliente%20Teste&companyId={C}')
    exp=float(fa['total'])+float(fa2['total']); chk('saldo apos anular recibo',abs(r['finalBalance']-exp)<0.01,(r['finalBalance'],exp))
# --- Pagamento ao fornecedor
pay={'id':'PAG2','number':'PAG 2026/2','docType':'PAG','series':'2026','seriesNumber':1,'date':D(2),'type':'PAYMENT','amount':2000,'beneficiaryCode':'F001','beneficiaryName':'Fornecedor Teste','paymentMethod':'NUM','companyId':C,'description':'Pag','relatedDocument':'FC 2026/1',
  'lines':[{'docType':'FC','docNumber':'FC 2026/1','originalAmount':float(fc['totalValue']),'amount':2000,'discount':0}]}
s,r=call('POST','/treasury/payments',pay); print('payment',s,str(r)[:150])
s,r=call('GET',f'/treasury/statement?side=SUPPLIER&entity=F001&name=Fornecedor%20Teste&companyId={C}'); 
if isinstance(r,dict):
    exp=float(fc['totalValue'])-2000  # fc2 rejeitada nao conta
    chk('extrato fornecedor saldo = FC - pagamento (FC2 anulada ignorada)',abs(r['finalBalance']-exp)<0.01,(r['finalBalance'],exp))
# --- Venda anulada sai do extrato
s,r=call('PATCH',f"/sales/documents/{fa2['id']}",{'status':'REJECTED'}); chk('FA2 anulada',s==200,r)
s,r=call('GET',f'/treasury/statement?side=CUSTOMER&entity=C001&name=Cliente%20Teste&companyId={C}')
if isinstance(r,dict): chk('FA2 anulada fora do extrato',abs(r['finalBalance']-float(fa['total']))<0.01,(r['finalBalance'],float(fa['total'])))
st,_=stock(); print('stock final',st)
print('RESULT','OK' if ok else 'COM FALHAS')
