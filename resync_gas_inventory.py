import requests
import sys

def resync_gas_inventory(company_id=None):
    base_url = "http://localhost:3000/gas-control/daily/resync-all"
    
    params = {}
    if company_id:
        params['companyId'] = company_id
    
    print(f"Iniciando sincronização de todos os dias de controlo de gás...")
    
    try:
        response = requests.post(base_url, params=params)
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Sucesso: {data.get('message', 'Sincronização concluída')}")
            print(f"Total de dias processados: {data.get('count', 0)}")
        else:
            print(f"Erro na sincronização: Status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Falha ao conectar ao servidor: {e}")

if __name__ == "__main__":
    company_id = sys.argv[1] if len(sys.argv) > 1 else None
    resync_gas_inventory(company_id)
