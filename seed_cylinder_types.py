import requests
import sys

def seed_cylinder_types(company_id):
    base_url = f"http://localhost:3000/gas-control/cylinder-types?companyId={company_id}"
    
    defaults = [
        { "name": "9KG", "brand": "PETROGAS", "priceRevendedor": 739, "priceBomba": 739, "priceConsumidor": 850 },
        { "name": "14KG", "brand": "PETROGAS", "priceRevendedor": 1149, "priceBomba": 1149, "priceConsumidor": 1300 },
        { "name": "19KG", "brand": "PETROGAS", "priceRevendedor": 1559, "priceBomba": 1559, "priceConsumidor": 1750 },
        { "name": "48KG", "brand": "PETROGAS", "priceRevendedor": 3800, "priceBomba": 3800, "priceConsumidor": 4200 },
        { "name": "6KG", "brand": "PETROGAS", "priceRevendedor": 480, "priceBomba": 480, "priceConsumidor": 550 },
        { "name": "11KG", "brand": "GALP", "priceRevendedor": 900, "priceBomba": 900, "priceConsumidor": 1050 },
        { "name": "45KG", "brand": "GALP", "priceRevendedor": 3750, "priceBomba": 3750, "priceConsumidor": 4100 },
        { "name": "05KG", "brand": "GALP", "priceRevendedor": 410, "priceBomba": 410, "priceConsumidor": 480 }
    ]
    
    print(f"Seeding cylinder types for company {company_id}...")
    
    for item in defaults:
        try:
            # We use POST to create or update
            response = requests.post(base_url, json=item)
            if response.status_code in [200, 201]:
                print(f" - Added/Updated {item['name']}")
            else:
                print(f" - Failed {item['name']}: {response.status_code}")
        except Exception as e:
            print(f" - Error {item['name']}: {e}")

if __name__ == "__main__":
    cid = sys.argv[1] if len(sys.argv) > 1 else '001'
    seed_cylinder_types(cid)
