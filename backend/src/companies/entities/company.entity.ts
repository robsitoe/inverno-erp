import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  nif?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  currentYear?: number;

  @Column({ nullable: true })
  type?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  chartOfAccounts?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ type: 'json', nullable: true })
  seriesConfig?: any;

  @Column({ type: 'json', nullable: true })
  dbConfig?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    type?: 'postgres' | 'sqlite';
  };

  @Column({ nullable: true })
  documentNameFormat?: string;

  // ── Dados impressos nos documentos (faturas, recibos...) ──
  @Column({ nullable: true })
  city?: string;

  /** Actividade / designação comercial (ex.: "Comércio geral"). */
  @Column({ nullable: true })
  activity?: string;

  @Column({ nullable: true })
  capital?: string;

  /** Número Único de Entidade Legal (NUEL). */
  @Column({ nullable: true })
  legalId?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  nib?: string;

  @Column({ nullable: true })
  iban?: string;

  @Column({ nullable: true })
  swift?: string;

  /** Texto livre no rodapé dos documentos (ex.: condições, contactos de assistência). */
  @Column({ type: 'text', nullable: true })
  documentFooter?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
