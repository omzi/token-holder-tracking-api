import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('BlockState')
export class BlockState {
  @PrimaryColumn()
  id: string = 'latest';

  @Column('bigint')
  lastProcessedBlock: string;
}
