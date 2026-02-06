import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { OfflineStorageService } from './offline-storage.service';
import { SalesDocument } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class SalesApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private storage: OfflineStorageService
  ) {}

  getSalesDocuments(companyId?: string): Observable<SalesDocument[]> {
    return this.storage.resolve(
      () => {
        const docs = this.storage.getItem<SalesDocument[]>('erp_sales_documents', []);
        return companyId ? docs.filter(d => d.companyId === companyId) : docs;
      },
      () => this.http.get<SalesDocument[]>(`${this.configService.baseUrl}/sales/documents?companyId=${companyId || ''}`)
    );
  }

  getSalesDocumentByNumber(companyId: string, type: string, series: string, number: number): Observable<SalesDocument | null> {
    return this.storage.resolve(
      () => {
        const docs = this.storage.getItem<SalesDocument[]>('erp_sales_documents', []);
        return docs.find((d: any) => d.companyId === companyId && d.documentType === type && d.series === series && d.seriesNumber === number) || null;
      },
      () => this.http.get<SalesDocument>(`${this.configService.baseUrl}/sales/documents/find?companyId=${companyId}&type=${type}&series=${series}&number=${number}`)
    );
  }

  saveSalesDocument(doc: SalesDocument): Observable<SalesDocument> {
    return this.storage.resolve(
      () => {
        const docs = this.storage.getItem<SalesDocument[]>('erp_sales_documents', []);
        const index = docs.findIndex(d => d.id === doc.id);
        if (index !== -1) docs[index] = doc;
        else docs.push(doc);
        this.storage.setItem('erp_sales_documents', docs);
        return doc;
      },
      () => this.http.post<SalesDocument>(`${this.configService.baseUrl}/sales/documents`, doc)
    );
  }
}
