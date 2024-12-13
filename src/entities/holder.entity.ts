import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('holders')
export class Holder {
  @PrimaryColumn()
  address: string;

  @Column({ type: 'decimal', precision: 78, scale: 18 })
  balance: string;
}
