import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_gateway_configs')
export class PaymentGatewayConfig {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    /** Provider identifier: EMOLA | MPESA | MKESH */
    @Column()
    provider: string;

    /** Human-readable name: e-Mola, M-Pesa, mKesh */
    @Column({ nullable: true })
    displayName: string;

    /** Agent code / Merchant ID provided by the operator */
    @Column({ nullable: true })
    agentCode: string;

    /** API Key or Token */
    @Column({ nullable: true })
    apiKey: string;

    /** API Secret, PIN or Public Key */
    @Column({ nullable: true })
    apiSecret: string;

    /** Service Provider Code (M-Pesa) */
    @Column({ nullable: true })
    serviceProviderCode: string;

    /** Base URL of the payment API */
    @Column({ nullable: true })
    baseUrl: string;

    /** Whether to use sandbox/test environment */
    @Column({ default: false })
    sandboxMode: boolean;

    /** Payment timeout in seconds */
    @Column({ type: 'int', default: 60 })
    timeoutSeconds: number;

    /** Whether this gateway is active */
    @Column({ default: true })
    isActive: boolean;

    /** Extra metadata as JSON */
    @Column({ nullable: true, type: 'text' })
    metadata: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
