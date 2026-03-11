import { Injectable } from '@angular/core';


import { HttpClient } from '@angular/common/http';


import { Observable } from 'rxjs';





const API_BASE = 'http://localhost:3000';





export interface GasCylinderType {


    id?: string;


    name: string;


    brand: 'PETROGAS' | 'GALP';


    priceRevendedor: number;


    priceBomba: number;


    priceConsumidor: number;
    inventoryTarget?: number;


}





export interface GasDailyEntry {


    id?: string;


    controlId: string;


    cylinderTypeId: string;


    customerName: string;


    entryType: 'CUSTOMER' | 'SUPPLIER';


    priceType: 'REVENDEDOR' | 'BOMBA' | 'CONSUMIDOR';


    s_gpl: number;


    s_vaz: number;


    s_av: number;


    vz_vend: number;


    adc_caucao: number;


    e_gpl: number;


    e_vaz: number;


    e_av: number;


    p_divida: number;


    totalAmount: number;


    gr: boolean;


    invoice: boolean;


}





@Injectable({


    providedIn: 'root'


})


export class GasService {


    private apiUrl = `${API_BASE}/gas-control`;





    constructor(private http: HttpClient) { }





    getCylinderTypes(companyId: string): Observable<GasCylinderType[]> {


        return this.http.get<GasCylinderType[]>(`${this.apiUrl}/cylinder-types?companyId=${companyId}`);


    }





    saveCylinderType(data: any, companyId: string): Observable<any> {


        return this.http.post(`${this.apiUrl}/cylinder-types?companyId=${companyId}`, data);


    }





    getDaily(date: string, companyId: string): Observable<{ control: any, entries: GasDailyEntry[] }> {


        return this.http.get<{ control: any, entries: GasDailyEntry[] }>(`${this.apiUrl}/daily?date=${date}&companyId=${companyId}`);


    }





    saveEntry(data: GasDailyEntry, companyId: string): Observable<GasDailyEntry> {


        return this.http.post<GasDailyEntry>(`${this.apiUrl}/entries?companyId=${companyId}`, data);


    }





    deleteEntry(id: string, companyId: string): Observable<any> {


        return this.http.delete(`${this.apiUrl}/entries/${id}?companyId=${companyId}`);


    }





    openDaily(date: string, user: string, companyId: string): Observable<any> {


        return this.http.post(`${this.apiUrl}/daily/open?companyId=${companyId}`, { date, user });


    }





    closeDaily(id: string, user: string, companyId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/daily/${id}/close?companyId=${companyId}`, { user });
    }

    reopenDaily(id: string, user: string, companyId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/daily/${id}/reopen?companyId=${companyId}`, { user });
    }





    updateStocks(controlId: string, initialStock: any, finalStock: any, user: string, companyId: string): Observable<any> {


        return this.http.patch(`${this.apiUrl}/daily/${controlId}/stocks?companyId=${companyId}`, { initialStock, finalStock, user });


    }


}


