import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { CompanyContextService } from './company-context.service';
import { OfflineStorageService } from './offline-storage.service';
import { Article } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private companyContext: CompanyContextService,
    private storage: OfflineStorageService
  ) {}

  getArticles(): Observable<Article[]> {
    return this.storage.resolve(
      () => {
        const companyId = this.companyContext.activeCompany?.id || '001';
        return this.storage.getItem<Article[]>(`erp_articles_${companyId}`, []);
      },
      () => {
        const companyId = this.companyContext.activeCompany?.id || '';
        return this.http.get<Article[]>(`${this.configService.baseUrl}/inventory/articles?companyId=${companyId}`);
      }
    );
  }

  saveArticle(article: Article | Article[]): Observable<Article | Article[]> {
    return this.storage.resolve(
      () => {
        const companyId = this.companyContext.activeCompany?.id || '001';
        const articles = this.storage.getItem<Article[]>(`erp_articles_${companyId}`, []);
        let finalArticles = articles;
        if (Array.isArray(article)) {
          finalArticles = article;
        } else {
          const index = articles.findIndex((a) => a.id === article.id);
          if (index !== -1) articles[index] = article;
          else articles.push(article);
        }
        this.storage.setItem(`erp_articles_${companyId}`, finalArticles);
        return article;
      },
      () => this.http.post<Article | Article[]>(`${this.configService.baseUrl}/inventory/articles`, article)
    );
  }
}
